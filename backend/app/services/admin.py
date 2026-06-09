from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.models.order import Order, OrderItem
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminCityCount,
    AdminDailyRevenue,
    AdminFunnelStep,
    AdminOrderItem,
    AdminOrderListItem,
    AdminOrdersResponse,
    AdminPeriodMetric,
    AdminRateMetric,
    AdminSheetSyncCount,
    AdminStatusCount,
)

DELIVERED_STATUSES = {"delivered"}
RETURNED_STATUSES = {"returned", "refused"}
CONFIRMED_STATUSES = {"confirmed", "packed", "shipped", "delivered", "returned", "refused"}
CANCELLED_STATUSES = {"cancelled", "no_answer"}


def list_admin_orders(
    db: Session,
    *,
    limit: int,
    offset: int,
    status: Optional[str] = None,
    sheet_sync_status: Optional[str] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> AdminOrdersResponse:
    query = _orders_query(db)
    query = _apply_order_filters(
        query,
        status=status,
        sheet_sync_status=sheet_sync_status,
        q=q,
        date_from=date_from,
        date_to=date_to,
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


def to_admin_order(order: Order) -> AdminOrderListItem:
    return AdminOrderListItem(
        id=order.id,
        public_order_number=order.public_order_number,
        status=order.status,
        customer_name=order.customer_name,
        phone_local=order.phone_local,
        phone_e164=order.phone_e164,
        city=order.city,
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
    sheet_sync_status: Optional[str],
    q: Optional[str],
    date_from: Optional[date],
    date_to: Optional[date],
):
    if status:
        query = query.filter(Order.status == status)
    if sheet_sync_status:
        query = query.filter(Order.sheet_sync_status == sheet_sync_status)
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
