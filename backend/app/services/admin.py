from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.order import Order, OrderItem
from app.services.hashing import sha256_hex
from app.services.phone import meta_phone_hash_input, normalize_morocco_phone, tiktok_phone_hash_input, to_local_morocco_phone
from app.services.digylog import DigylogError, push_order_to_digylog
from app.schemas.admin import (
    CALL_STATUS_TO_ORDER_STATUS,
    RETRY_CALL_STATUSES,
    AdminAnalyticsResponse,
    AdminCallCenterStats,
    AdminCityCount,
    AdminDailyRevenue,
    AdminDispatchResponse,
    AdminFunnelStep,
    AdminOrderItem,
    AdminOrderListItem,
    AdminOrdersResponse,
    AdminPeriodMetric,
    AdminRateByOffer,
    AdminRatePeriod,
    AdminRateMetric,
    AdminSheetSyncCount,
    AdminStatusCount,
)

DELIVERED_STATUSES = {"delivered"}
RETURNED_STATUSES = {"returned", "refused"}
CONFIRMED_STATUSES = {"confirmed", "packed", "shipped", "delivered", "returned", "refused"}
CANCELLED_STATUSES = {"cancelled", "no_answer"}


CONTACTABLE_STATUSES = {"new", "no_answer", "awaiting_confirmation"}
# Orders in these states are already handled and should not appear in contact queues.
NON_CONTACT_STATUSES = {"cancelled", "refused", "delivered", "returned", "shipped", "packed", "confirmed"}
BLACKLIST_ERROR_PATTERNS = ("%liste noire%", "%blacklist%")


def list_admin_orders(
    db: Session,
    *,
    limit: int,
    offset: int,
    status: Optional[str] = None,
    call_status: Optional[str] = None,
    bucket: Optional[str] = None,
    sheet_sync_status: Optional[str] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    product_sku: Optional[str] = None,
) -> AdminOrdersResponse:
    query = _orders_query(db)
    query = _apply_order_filters(
        query,
        status=status,
        call_status=call_status,
        bucket=bucket,
        sheet_sync_status=sheet_sync_status,
        q=q,
        date_from=date_from,
        date_to=date_to,
        product_sku=product_sku,
    )
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return AdminOrdersResponse(
        total=total,
        limit=limit,
        offset=offset,
        orders=[to_admin_order(order) for order in orders],
    )


def get_admin_analytics(db: Session, *, days: int) -> AdminAnalyticsResponse:
    safe_days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    start_at = now - timedelta(days=safe_days)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)

    total_orders, total_revenue = _count_and_revenue(db, start_at)
    today_orders, today_revenue = _count_and_revenue(db, today_start)
    sheet_counts = _sheet_sync_breakdown(db, start_at)

    return AdminAnalyticsResponse(
        days=safe_days,
        total_orders=total_orders,
        total_revenue_mad=total_revenue,
        average_order_value_mad=round(total_revenue / total_orders) if total_orders else 0,
        today_orders=today_orders,
        today_revenue_mad=today_revenue,
        pending_sheet_sync=_count_sync_status(sheet_counts, "pending"),
        failed_sheet_sync=_count_sync_status(sheet_counts, "failed"),
        status_breakdown=_status_breakdown(db, start_at),
        sheet_sync_breakdown=sheet_counts,
        daily_revenue=_daily_revenue(db, start_at),
        top_cities=_top_cities(db, start_at),
        recent_orders=[
            to_admin_order(order)
            for order in _orders_query(db).order_by(Order.created_at.desc()).limit(6).all()
        ],
        period_metrics=_period_metrics(db, now),
        delivery_metrics=_delivery_metrics(db, start_at),
        order_funnel=_order_funnel(db, start_at),
    )


def update_admin_order_status(db: Session, order_id: str, new_status: str) -> Optional[AdminOrderListItem]:
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        return None
    order = db.get(Order, order_uuid)
    if not order:
        return None
    order.status = new_status
    db.commit()
    db.refresh(order)
    return to_admin_order(order)


def update_admin_order_call(
    db: Session,
    order_id: str,
    *,
    call_status: str,
    call_note: Optional[str] = None,
    delivery_company: Optional[str] = None,
    delivery_city: Optional[str] = None,
) -> Optional[AdminOrderListItem]:
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        return None
    order = db.get(Order, order_uuid)
    if not order:
        return None

    order.call_status = call_status
    if call_note is not None:
        order.call_note = call_note.strip() or None
    if delivery_company is not None:
        order.delivery_company = delivery_company.strip() or None
    if delivery_city is not None:
        order.delivery_city = delivery_city.strip() or None

    if call_status in RETRY_CALL_STATUSES:
        order.call_attempts = (order.call_attempts or 0) + 1

    mapped_status = CALL_STATUS_TO_ORDER_STATUS.get(call_status)
    if mapped_status:
        order.status = mapped_status

    db.commit()
    db.refresh(order)
    return to_admin_order(order)


def update_admin_order_details(
    db: Session,
    order_id: str,
    *,
    customer_name: Optional[str] = None,
    phone_raw: Optional[str] = None,
    phone_e164: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    delivery_city: Optional[str] = None,
    qty: Optional[int] = None,
    total_mad: Optional[int] = None,
) -> Optional[AdminOrderListItem]:
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        return None
    order = db.get(Order, order_uuid)
    if not order:
        return None

    if customer_name is not None:
        order.customer_name = customer_name.strip()
    if phone_raw is not None or phone_e164 is not None:
        normalized_phone = normalize_morocco_phone(phone_e164 or phone_raw or order.phone_e164)
        order.phone_raw = (phone_raw or normalized_phone).strip()
        order.phone_e164 = normalized_phone
        order.phone_local = to_local_morocco_phone(normalized_phone)
        order.phone_hash_meta = sha256_hex(meta_phone_hash_input(normalized_phone))
        order.phone_hash_tiktok = sha256_hex(tiktok_phone_hash_input(normalized_phone))
        order.delivery_error = None
        order.delivery_tracking = None
        order.dispatched_at = None
        if order.status == "shipped":
            order.status = "confirmed"
    if address is not None:
        order.address = address.strip() or None
    if city is not None:
        order.city = city.strip() or None
    if delivery_city is not None:
        order.delivery_city = delivery_city.strip() or None
    if qty is not None:
        order.hero_qty = qty
    if total_mad is not None:
        order.total_mad = total_mad
        order.subtotal_mad = total_mad

    new_qty = order.hero_qty or 1
    order.hero_price_mad = round(order.total_mad / new_qty) if new_qty else order.total_mad
    if order.items:
        item = order.items[0]
        item.qty = new_qty
        item.total_price_mad = order.total_mad
        item.unit_price_mad = order.hero_price_mad

    db.commit()
    db.refresh(order)
    return to_admin_order(order)


def dispatch_orders(
    db: Session,
    *,
    order_ids: list[str],
    delivery_company: Optional[str],
    new_status: str,
) -> AdminDispatchResponse:
    uuids = []
    for raw in order_ids:
        try:
            uuids.append(UUID(raw))
        except ValueError:
            continue
    if not uuids:
        return AdminDispatchResponse(updated=0, orders=[])

    orders = db.query(Order).options(selectinload(Order.items)).filter(Order.id.in_(uuids)).all()
    settings = get_settings()
    now = datetime.now(timezone.utc)
    for order in orders:
        if delivery_company:
            order.delivery_company = delivery_company
        if settings.digylog_enabled:
            try:
                tracking = push_order_to_digylog(order)
                order.delivery_tracking = tracking
                order.delivery_error = None
                order.status = new_status
                if order.dispatched_at is None:
                    order.dispatched_at = now
            except DigylogError as exc:
                order.delivery_error = str(exc)
                order.delivery_tracking = None
                order.dispatched_at = None
                if order.status == new_status or order.status == "shipped":
                    order.status = "confirmed"
                # keep failed dispatches out of shipped/payout queues; agents can review or retry.
        else:
            order.status = new_status
            if order.dispatched_at is None:
                order.dispatched_at = now
    db.commit()
    for order in orders:
        db.refresh(order)
    return AdminDispatchResponse(updated=len(orders), orders=[to_admin_order(o) for o in orders])


def get_call_center_stats(db: Session, *, product_sku: Optional[str] = None) -> AdminCallCenterStats:
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start - timedelta(microseconds=1)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    last_month_end = month_start - timedelta(microseconds=1)
    last_month_start = datetime(last_month_end.year, last_month_end.month, 1, tzinfo=timezone.utc)

    periods = [
        ("today", "Today", today_start, now),
        ("yesterday", "Yesterday", yesterday_start, yesterday_end),
        ("last_7_days", "Last 7 Days", now - timedelta(days=7), now),
        ("last_15_days", "Last 15 Days", now - timedelta(days=15), now),
        ("last_30_days", "Last 30 Days", now - timedelta(days=30), now),
        ("last_month", "Last Month", last_month_start, last_month_end),
        ("last_90_days", "Last 90 Days", now - timedelta(days=90), now),
    ]
    by_period = []
    for key, label, start_at, end_at in periods:
        total = _count_between(db, start_at, end_at, product_sku=product_sku)
        confirmed = _count_between(db, start_at, end_at, CONFIRMED_STATUSES, product_sku=product_sku)
        by_period.append(AdminRatePeriod(key=key, label=label, total=total, confirmed=confirmed, rate=_percent(confirmed, total)))

    confirmed_expr = func.coalesce(func.sum(case((Order.status.in_(CONFIRMED_STATUSES), 1), else_=0)), 0)
    offer_query = db.query(Order.hero_qty, func.count(Order.id), confirmed_expr)
    if product_sku:
        offer_query = offer_query.filter(Order.hero_sku == product_sku)
    rows = offer_query.group_by(Order.hero_qty).order_by(Order.hero_qty.asc()).all()
    by_offer = []
    for qty, total, confirmed in rows:
        total_i = int(total or 0)
        confirmed_i = int(confirmed or 0)
        by_offer.append(
            AdminRateByOffer(
                offer_id=_offer_label(int(qty or 1)),
                qty=int(qty or 1),
                total=total_i,
                confirmed=confirmed_i,
                rate=_percent(confirmed_i, total_i),
            )
        )

    return AdminCallCenterStats(by_period=by_period, by_offer=by_offer)


def _count_between(db: Session, start_at: datetime, end_at: datetime, statuses: Optional[set[str]] = None, product_sku: Optional[str] = None) -> int:
    query = db.query(func.count(Order.id)).filter(Order.created_at >= start_at, Order.created_at <= end_at)
    if statuses:
        query = query.filter(Order.status.in_(statuses))
    if product_sku:
        query = query.filter(Order.hero_sku == product_sku)
    return int(query.scalar() or 0)


def _offer_label(qty: int) -> str:
    return {1: "one", 2: "two", 3: "three"}.get(qty, "more")


def to_admin_order(order: Order) -> AdminOrderListItem:
    return AdminOrderListItem(
        id=order.id,
        public_order_number=order.public_order_number,
        status=order.status,
        customer_name=order.customer_name,
        phone_local=order.phone_local,
        phone_e164=order.phone_e164,
        city=order.city,
        address=order.address,
        browser_fingerprint=order.browser_fingerprint,
        device_id=order.device_id,
        risk_score=order.risk_score or 0,
        risk_level=order.risk_level or "low",
        fraud_flags=order.fraud_flags,
        block_reason=order.block_reason,
        fraud_checked_at=order.fraud_checked_at,
        call_status=order.call_status,
        call_note=order.call_note,
        delivery_tracking=order.delivery_tracking,
        delivery_error=order.delivery_error,
        call_attempts=order.call_attempts or 0,
        delivery_company=order.delivery_company,
        delivery_city=order.delivery_city,
        hero_sku=order.hero_sku,
        hero_qty=order.hero_qty,
        total_mad=order.total_mad,
        currency=order.currency,
        sheet_sync_status=order.sheet_sync_status,
        sheet_last_error=order.sheet_last_error,
        created_at=order.created_at,
        updated_at=order.updated_at,
        utm=order.utm,
        items=[_to_admin_order_item(item) for item in order.items],
    )


def _orders_query(db: Session):
    return db.query(Order).options(selectinload(Order.items))


def _apply_order_filters(
    query,
    *,
    status: Optional[str],
    call_status: Optional[str],
    bucket: Optional[str] = None,
    sheet_sync_status: Optional[str],
    q: Optional[str],
    date_from: Optional[date],
    date_to: Optional[date],
    product_sku: Optional[str],
):
    if bucket == "new":
        query = query.filter(Order.call_status.is_(None), Order.status.notin_(NON_CONTACT_STATUSES))
    elif bucket == "follow_up":
        query = query.filter(Order.call_status.in_(RETRY_CALL_STATUSES))
    elif bucket == "blacklist":
        query = _blacklist_filter(query)
    elif bucket == "contactable":
        query = query.filter(Order.status.in_(CONTACTABLE_STATUSES))
    elif bucket == "confirmed":
        query = query.filter(Order.status == "confirmed")
        query = _not_blacklist_filter(query)
    elif bucket == "shipped":
        query = query.filter(Order.status == "shipped")
    if status:
        query = query.filter(Order.status == status)
    if call_status:
        if call_status == "pending":
            query = query.filter(Order.call_status.is_(None))
        else:
            query = query.filter(Order.call_status == call_status)
    if sheet_sync_status:
        query = query.filter(Order.sheet_sync_status == sheet_sync_status)
    if product_sku:
        query = query.filter(Order.hero_sku == product_sku)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Order.public_order_number.ilike(like),
                Order.customer_name.ilike(like),
                Order.phone_local.ilike(like),
                Order.phone_e164.ilike(like),
                Order.city.ilike(like),
            )
        )
    if date_from:
        query = query.filter(Order.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Order.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    return query


def _blacklist_filter(query):
    return query.filter(or_(*[Order.delivery_error.ilike(pattern) for pattern in BLACKLIST_ERROR_PATTERNS]))


def _not_blacklist_filter(query):
    return query.filter(or_(Order.delivery_error.is_(None), ~or_(*[Order.delivery_error.ilike(pattern) for pattern in BLACKLIST_ERROR_PATTERNS])))


def _to_admin_order_item(item: OrderItem) -> AdminOrderItem:
    return AdminOrderItem(
        sku=item.sku,
        name_ar=item.name_ar,
        qty=item.qty,
        unit_price_mad=item.unit_price_mad,
        total_price_mad=item.total_price_mad,
        item_type=item.item_type,
    )


def _count_and_revenue(db: Session, start_at: datetime) -> tuple[int, int]:
    orders, revenue = (
        db.query(func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start_at)
        .one()
    )
    return int(orders or 0), int(revenue or 0)


def _count_and_revenue_between(db: Session, start_at: datetime, end_at: datetime) -> tuple[int, int]:
    orders, revenue = (
        db.query(func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start_at, Order.created_at <= end_at)
        .one()
    )
    return int(orders or 0), int(revenue or 0)


def _period_metrics(db: Session, now: datetime) -> list[AdminPeriodMetric]:
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start - timedelta(microseconds=1)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    last_month_end = month_start - timedelta(microseconds=1)
    last_month_start = datetime(last_month_end.year, last_month_end.month, 1, tzinfo=timezone.utc)
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    last_year_start = datetime(now.year - 1, 1, 1, tzinfo=timezone.utc)
    last_year_end = year_start - timedelta(microseconds=1)

    periods = [
        ("today", "Today", today_start, now),
        ("yesterday", "Yesterday", yesterday_start, yesterday_end),
        ("last_2_days", "Last 2 Days", now - timedelta(days=2), now),
        ("last_3_days", "Last 3 Days", now - timedelta(days=3), now),
        ("last_4_days", "Last 4 Days", now - timedelta(days=4), now),
        ("last_7_days", "Last 7 Days", now - timedelta(days=7), now),
        ("last_15_days", "Last 15 Days", now - timedelta(days=15), now),
        ("last_30_days", "Last 30 Days", now - timedelta(days=30), now),
        ("last_60_days", "Last 60 Days", now - timedelta(days=60), now),
        ("last_90_days", "Last 90 Days", now - timedelta(days=90), now),
        ("last_180_days", "Last 180 Days", now - timedelta(days=180), now),
        ("last_365_days", "Last 365 Days", now - timedelta(days=365), now),
        ("this_month", "This Month", month_start, now),
        ("last_month", "Last Month", last_month_start, last_month_end),
        ("this_year", "This Year", year_start, now),
        ("last_year", "Last Year", last_year_start, last_year_end),
    ]
    metrics = []
    for key, label, start_at, end_at in periods:
        orders, revenue = _count_and_revenue_between(db, start_at, end_at)
        metrics.append(AdminPeriodMetric(key=key, label=label, orders=orders, revenue_mad=revenue))
    return metrics


def _delivery_metrics(db: Session, start_at: datetime) -> list[AdminRateMetric]:
    total_orders = _status_count(db, start_at)
    confirmed = _status_count(db, start_at, CONFIRMED_STATUSES)
    shipped = _status_count(db, start_at, {"shipped", "delivered", "returned", "refused"})
    delivered = _status_count(db, start_at, DELIVERED_STATUSES)
    returned = _status_count(db, start_at, RETURNED_STATUSES)
    cancelled = _status_count(db, start_at, CANCELLED_STATUSES)

    return [
        AdminRateMetric(key="delivery_rate", label="Delivery Rate", value=_percent(delivered, shipped)),
        AdminRateMetric(key="return_rate", label="Return Rate", value=_percent(returned, shipped)),
        AdminRateMetric(key="cancellation_rate", label="Cancellation Rate", value=_percent(cancelled, total_orders)),
        AdminRateMetric(key="confirmation_rate", label="Confirmation Rate", value=_percent(confirmed, total_orders)),
        AdminRateMetric(key="average_delivery_time", label="Average Delivery Time", value=0),
    ]


def _order_funnel(db: Session, start_at: datetime) -> list[AdminFunnelStep]:
    total = _status_count(db, start_at)
    confirmed = _status_count(db, start_at, CONFIRMED_STATUSES)
    shipped = _status_count(db, start_at, {"shipped", "delivered", "returned", "refused"})
    delivered = _status_count(db, start_at, DELIVERED_STATUSES)
    paid = delivered
    steps = [
        ("orders", "Orders", total),
        ("confirmed", "Confirmed", confirmed),
        ("shipped", "Shipped", shipped),
        ("delivered", "Delivered", delivered),
        ("paid", "Paid", paid),
    ]
    return [AdminFunnelStep(key=key, label=label, count=count, rate=_percent(count, total)) for key, label, count in steps]


def _status_count(db: Session, start_at: datetime, statuses: Optional[set[str]] = None) -> int:
    query = db.query(func.count(Order.id)).filter(Order.created_at >= start_at)
    if statuses:
        query = query.filter(Order.status.in_(statuses))
    return int(query.scalar() or 0)


def _percent(value: int, total: int) -> float:
    if not total:
        return 0
    return round((value / total) * 100, 1)


def _status_breakdown(db: Session, start_at: datetime) -> list[AdminStatusCount]:
    rows = (
        db.query(Order.status, func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start_at)
        .group_by(Order.status)
        .order_by(func.count(Order.id).desc())
        .all()
    )
    return [AdminStatusCount(status=row[0], count=int(row[1] or 0), total_mad=int(row[2] or 0)) for row in rows]


def _sheet_sync_breakdown(db: Session, start_at: datetime) -> list[AdminSheetSyncCount]:
    rows = (
        db.query(Order.sheet_sync_status, func.count(Order.id))
        .filter(Order.created_at >= start_at)
        .group_by(Order.sheet_sync_status)
        .all()
    )
    return [AdminSheetSyncCount(status=row[0], count=int(row[1] or 0)) for row in rows]


def _daily_revenue(db: Session, start_at: datetime) -> list[AdminDailyRevenue]:
    rows = (
        db.query(func.date(Order.created_at), func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start_at)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at).asc())
        .all()
    )
    return [AdminDailyRevenue(date=row[0], orders=int(row[1] or 0), total_mad=int(row[2] or 0)) for row in rows]


def _top_cities(db: Session, start_at: datetime) -> list[AdminCityCount]:
    rows = (
        db.query(Order.city, func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start_at)
        .group_by(Order.city)
        .order_by(func.count(Order.id).desc())
        .limit(8)
        .all()
    )
    return [
        AdminCityCount(city=row[0] or "غير محددة", orders=int(row[1] or 0), total_mad=int(row[2] or 0))
        for row in rows
    ]


def _count_sync_status(rows: list[AdminSheetSyncCount], status: str) -> int:
    return next((row.count for row in rows if row.status == status), 0)
