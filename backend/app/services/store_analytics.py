from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, time, timedelta, timezone
import logging
from typing import Optional

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.models.order import ConversionEvent, Order, OrderItem
from app.models.product_link import ProductLink, ProductLinkClick
from app.schemas.store_analytics import (
    StoreAnalyticsResponse,
    StoreCodAnalytics,
    StoreComparison,
    StoreCustomerAnalytics,
    StoreFunnelStep,
    StoreGeoMetric,
    StoreKpi,
    StoreLandingPageMetric,
    StoreProductMetric,
    StoreRealtimeAnalytics,
    StoreTrafficSource,
    StoreTrendPoint,
)

logger = logging.getLogger(__name__)

DELIVERED = {"delivered"}
RETURNED = {"returned", "refused"}
CONFIRMED = {"confirmed", "packed", "shipped", "delivered", "returned", "refused"}
SHIPPED = {"shipped", "delivered", "returned", "refused"}
CANCELLED = {"cancelled", "no_answer"}
PENDING = {"new", "awaiting_confirmation"}

SOURCE_LABELS = {
    "tiktok": "TikTok Ads",
    "facebook": "Facebook Ads",
    "meta": "Meta Ads",
    "instagram": "Instagram Ads",
    "google": "Google Ads",
    "youtube": "YouTube Ads",
    "whatsapp": "WhatsApp",
    "organic": "Organic Search",
    "referral": "Referral Traffic",
    "direct": "Direct Traffic",
}


def get_store_analytics(db: Session, *, days: int) -> StoreAnalyticsResponse:
    safe_days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    start = _period_start(now, safe_days)
    yesterday_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc) - timedelta(days=1)
    yesterday_end = yesterday_start + timedelta(days=1)
    last_7_start = now - timedelta(days=7)
    last_30_start = now - timedelta(days=30)

    current = _metrics(db, start, now)
    yesterday = _metrics(db, yesterday_start, yesterday_end)
    last_7 = _metrics(db, last_7_start, now)
    last_30 = _metrics(db, last_30_start, now)

    notes = [
        "Traffic metrics are based on Product Links Manager clicks/visitors plus stored order UTM sources.",
        "Bounce rate and session duration require a full onsite event collector; current bounce rate is estimated from single-click visitors.",
    ]

    traffic_sources = _safe("traffic_sources", lambda: _traffic_sources(db, start, now), [], notes)
    funnel = _safe("funnel", lambda: _funnel(db, start, now), [], notes)
    trends = _safe("trends", lambda: _trends(db, start, now), [], notes)
    products = _safe("products", lambda: _products(db, start, now), [], notes)
    landing_pages = _safe("landing_pages", lambda: _landing_pages(db, start, now), [], notes)
    geo = _safe("geo", lambda: _geo(db, start, now), [], notes)
    customer = _safe("customer", lambda: _customers(db, start, now), _empty_customer(), notes)
    realtime = _safe("realtime", lambda: _realtime(db, now), _empty_realtime(), notes)

    return StoreAnalyticsResponse(
        days=safe_days,
        executive_kpis=_executive_kpis(current, yesterday, last_7, last_30),
        traffic_sources=traffic_sources,
        funnel=funnel,
        trends=trends,
        products=products,
        landing_pages=landing_pages,
        geo=geo,
        customer=customer,
        cod=_cod(current),
        realtime=realtime,
        notes=notes,
    )


def _safe(label: str, fn, fallback, notes: list[str]):
    try:
        return fn()
    except Exception:
        logger.exception("Store Analytics section failed: %s", label)
        notes.append(f"{label} temporarily unavailable because one stored record has unexpected data.")
        return fallback


def _empty_customer() -> StoreCustomerAnalytics:
    return StoreCustomerAnalytics(
        total_customers=0,
        new_customers=0,
        returning_customers=0,
        repeat_purchase_rate=0,
        customer_lifetime_value_mad=0,
        average_orders_per_customer=0,
    )


def _empty_realtime() -> StoreRealtimeAnalytics:
    return StoreRealtimeAnalytics(
        active_visitors=0,
        orders_today=0,
        orders_this_hour=0,
        revenue_today_mad=0,
        revenue_this_hour_mad=0,
    )


def _period_start(now: datetime, days: int) -> datetime:
    start_day = (now - timedelta(days=max(0, days - 1))).date()
    return datetime.combine(start_day, time.min, tzinfo=timezone.utc)


def _orders_between(db: Session, start: datetime, end: datetime):
    return db.query(Order).filter(Order.created_at >= start, Order.created_at < end)


def _metrics(db: Session, start: datetime, end: datetime) -> dict:
    orders = _orders_between(db, start, end).all()
    total_orders = len(orders)
    revenue = sum(o.total_mad for o in orders)
    confirmed = sum(1 for o in orders if o.status in CONFIRMED)
    shipped = sum(1 for o in orders if o.status in SHIPPED)
    delivered = sum(1 for o in orders if o.status in DELIVERED)
    cancelled = sum(1 for o in orders if o.status in CANCELLED)
    returned = sum(1 for o in orders if o.status in RETURNED)
    pending = sum(1 for o in orders if o.status in PENDING)
    customers = {o.phone_e164 for o in orders}
    visitor_count = _unique_visitors(db, start, end)
    return {
        "revenue": revenue,
        "net_revenue": sum(o.total_mad for o in orders if o.status not in RETURNED | CANCELLED),
        "orders": total_orders,
        "confirmed": confirmed,
        "shipped": shipped,
        "delivered": delivered,
        "cancelled": cancelled,
        "returned": returned,
        "pending": pending,
        "customers": len(customers),
        "aov": round(revenue / total_orders, 2) if total_orders else 0,
        "rpv": round(revenue / visitor_count, 2) if visitor_count else 0,
        "visitors": visitor_count,
    }


def _unique_visitors(db: Session, start: datetime, end: datetime) -> int:
    return int(
        db.query(func.count(distinct(ProductLinkClick.visitor_hash)))
        .filter(ProductLinkClick.created_at >= start, ProductLinkClick.created_at < end)
        .scalar()
        or 0
    )


def _compare(current: float, previous: float) -> float:
    if not previous:
        return 100.0 if current else 0.0
    return round(((current - previous) / previous) * 100, 2)


def _kpi(key: str, label: str, value: float, unit: str, current: dict, y: dict, d7: dict, d30: dict) -> StoreKpi:
    return StoreKpi(
        key=key,
        label=label,
        value=value,
        unit=unit,
        comparison=StoreComparison(
            yesterday_pct=_compare(value, y.get(key, 0)),
            last_7_days_pct=_compare(value, d7.get(key, 0)),
            last_30_days_pct=_compare(value, d30.get(key, 0)),
        ),
    )


def _executive_kpis(current: dict, yesterday: dict, last_7: dict, last_30: dict) -> list[StoreKpi]:
    returning = max(current["orders"] - current["customers"], 0)
    current = {**current, "new_customers": current["customers"], "returning_customers": returning}
    yesterday = {**yesterday, "new_customers": yesterday["customers"], "returning_customers": max(yesterday["orders"] - yesterday["customers"], 0)}
    last_7 = {**last_7, "new_customers": last_7["customers"], "returning_customers": max(last_7["orders"] - last_7["customers"], 0)}
    last_30 = {**last_30, "new_customers": last_30["customers"], "returning_customers": max(last_30["orders"] - last_30["customers"], 0)}

    fields = [
        ("revenue", "Total Revenue", "MAD"),
        ("net_revenue", "Net Revenue", "MAD"),
        ("orders", "Total Orders", ""),
        ("confirmed", "Confirmed Orders", ""),
        ("shipped", "Shipped Orders", ""),
        ("delivered", "Delivered Orders", ""),
        ("cancelled", "Cancelled Orders", ""),
        ("returned", "Returned Orders", ""),
        ("pending", "Pending Orders", ""),
        ("customers", "Total Customers", ""),
        ("new_customers", "New Customers", ""),
        ("returning_customers", "Returning Customers", ""),
        ("aov", "Average Order Value", "MAD"),
        ("rpv", "Revenue Per Visitor", "MAD"),
    ]
    return [_kpi(key, label, current[key], unit, current, yesterday, last_7, last_30) for key, label, unit in fields]


def _source_from_utm(utm: Optional[dict]) -> str:
    if not isinstance(utm, dict):
        return "Direct Traffic"
    raw = str(utm.get("utm_source") or utm.get("source") or "direct").lower()
    if "tt" in raw or "tiktok" in raw:
        return "TikTok Ads"
    if "fb" in raw or "facebook" in raw:
        return "Facebook Ads"
    if "ig" in raw or "instagram" in raw:
        return "Instagram Ads"
    if "google" in raw or "gclid" in raw:
        return "Google Ads"
    if "youtube" in raw:
        return "YouTube Ads"
    if "whatsapp" in raw:
        return "WhatsApp"
    return SOURCE_LABELS.get(raw, "Direct Traffic" if raw == "direct" else "Other Sources")


def _traffic_sources(db: Session, start: datetime, end: datetime) -> list[StoreTrafficSource]:
    clicks = (
        db.query(ProductLink.platform, func.count(distinct(ProductLinkClick.visitor_hash)))
        .join(ProductLinkClick, ProductLinkClick.link_id == ProductLink.id)
        .filter(ProductLinkClick.created_at >= start, ProductLinkClick.created_at < end)
        .group_by(ProductLink.platform)
        .all()
    )
    visitors = Counter()
    for platform, count in clicks:
        visitors[SOURCE_LABELS.get(platform, platform.title())] += int(count or 0)

    orders_by_source: dict[str, dict[str, int]] = defaultdict(lambda: {"orders": 0, "revenue": 0})
    for order in _orders_between(db, start, end).all():
        source = _source_from_utm(order.utm)
        orders_by_source[source]["orders"] += 1
        orders_by_source[source]["revenue"] += order.total_mad

    sources = sorted(set(visitors) | set(orders_by_source))
    return [
        StoreTrafficSource(
            source=source,
            visitors=visitors[source],
            orders=orders_by_source[source]["orders"],
            revenue_mad=orders_by_source[source]["revenue"],
            conversion_rate=_pct(orders_by_source[source]["orders"], visitors[source]),
        )
        for source in sources
    ]


def _event_count(db: Session, start: datetime, end: datetime, names: set[str]) -> int:
    return int(
        db.query(func.count(ConversionEvent.id))
        .filter(ConversionEvent.created_at >= start, ConversionEvent.created_at < end, ConversionEvent.event_name.in_(names))
        .scalar()
        or 0
    )


def _funnel(db: Session, start: datetime, end: datetime) -> list[StoreFunnelStep]:
    visitors = _unique_visitors(db, start, end)
    product_views = max(visitors, _event_count(db, start, end, {"ViewContent", "PageView"}))
    add_to_cart = _event_count(db, start, end, {"AddToCart"})
    checkout = _event_count(db, start, end, {"InitiateCheckout"})
    submitted = _orders_between(db, start, end).count()
    confirmed = _orders_between(db, start, end).filter(Order.status.in_(CONFIRMED)).count()
    delivered = _orders_between(db, start, end).filter(Order.status.in_(DELIVERED)).count()
    raw = [
        ("visitors", "Visitors", visitors),
        ("product_views", "Product Views", product_views),
        ("add_to_cart", "Add To Cart", add_to_cart),
        ("checkout", "Checkout Started", checkout),
        ("submitted", "Order Submitted", submitted),
        ("confirmed", "Order Confirmed", confirmed),
        ("delivered", "Order Delivered", delivered),
    ]
    out = []
    prev = raw[0][2] if raw else 0
    for key, label, count in raw:
        rate = _pct(count, prev) if key != "visitors" else 100.0
        out.append(StoreFunnelStep(key=key, label=label, count=count, step_rate=rate, dropoff_rate=max(0, round(100 - rate, 2))))
        prev = count
    return out


def _trends(db: Session, start: datetime, end: datetime) -> list[StoreTrendPoint]:
    order_rows = (
        db.query(func.date(Order.created_at), func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start, Order.created_at < end)
        .group_by(func.date(Order.created_at))
        .all()
    )
    click_rows = (
        db.query(func.date(ProductLinkClick.created_at), func.count(distinct(ProductLinkClick.visitor_hash)))
        .filter(ProductLinkClick.created_at >= start, ProductLinkClick.created_at < end)
        .group_by(func.date(ProductLinkClick.created_at))
        .all()
    )
    orders = {d: (int(c or 0), int(r or 0)) for d, c, r in order_rows}
    visitors = {d: int(c or 0) for d, c in click_rows}
    days = sorted(set(orders) | set(visitors))
    return [StoreTrendPoint(date=d, visitors=visitors.get(d, 0), orders=orders.get(d, (0, 0))[0], revenue_mad=orders.get(d, (0, 0))[1]) for d in days]


def _products(db: Session, start: datetime, end: datetime) -> list[StoreProductMetric]:
    rows = (
        db.query(OrderItem.name_ar, func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= start, Order.created_at < end)
        .group_by(OrderItem.name_ar)
        .all()
    )
    views = _unique_visitors(db, start, end)
    out = []
    for name, orders, revenue in rows:
        total = int(orders or 0)
        delivered = _orders_between(db, start, end).filter(Order.status.in_(DELIVERED)).count()
        cancelled = _orders_between(db, start, end).filter(Order.status.in_(CANCELLED)).count()
        returned = _orders_between(db, start, end).filter(Order.status.in_(RETURNED)).count()
        out.append(StoreProductMetric(product_name=name, views=views, orders=total, revenue_mad=int(revenue or 0), conversion_rate=_pct(total, views), delivery_rate=_pct(delivered, total), cancelled_orders=cancelled, returned_orders=returned))
    return out


def _landing_pages(db: Session, start: datetime, end: datetime) -> list[StoreLandingPageMetric]:
    links = db.query(ProductLink).all()
    out = []
    for link in links:
        visitors = int(db.query(func.count(distinct(ProductLinkClick.visitor_hash))).filter(ProductLinkClick.link_id == link.id, ProductLinkClick.created_at >= start, ProductLinkClick.created_at < end).scalar() or 0)
        orders = _orders_between(db, start, end).filter(Order.utm["product_link_slug"].astext == link.slug).all()
        total = len(orders)
        confirmed = sum(1 for o in orders if o.status in CONFIRMED)
        delivered = sum(1 for o in orders if o.status in DELIVERED)
        revenue = sum(o.total_mad for o in orders)
        out.append(StoreLandingPageMetric(page=link.name, visitors=visitors, orders=total, confirmed_orders=confirmed, delivered_orders=delivered, revenue_mad=revenue, conversion_rate=_pct(total, visitors), bounce_rate=0 if total else (100.0 if visitors else 0.0)))
    return sorted(out, key=lambda x: x.revenue_mad, reverse=True)


def _geo(db: Session, start: datetime, end: datetime) -> list[StoreGeoMetric]:
    rows = (
        db.query(func.coalesce(Order.delivery_city, Order.city, "Other"), func.count(Order.id), func.coalesce(func.sum(Order.total_mad), 0))
        .filter(Order.created_at >= start, Order.created_at < end)
        .group_by(func.coalesce(Order.delivery_city, Order.city, "Other"))
        .order_by(func.count(Order.id).desc())
        .all()
    )
    out = []
    for city, orders, revenue in rows:
        city_orders = _orders_between(db, start, end).filter(func.coalesce(Order.delivery_city, Order.city, "Other") == city)
        delivered = city_orders.filter(Order.status.in_(DELIVERED)).count()
        total = int(orders or 0)
        out.append(StoreGeoMetric(city=city, orders=total, revenue_mad=int(revenue or 0), delivery_rate=_pct(delivered, total)))
    return out


def _customers(db: Session, start: datetime, end: datetime) -> StoreCustomerAnalytics:
    # Count lifetime orders per phone in SQL (avoids Python-side datetime
    # comparisons, which break when the driver returns naive datetimes).
    orders_per_phone = Counter(
        {phone: int(count or 0) for phone, count in db.query(Order.phone_e164, func.count(Order.id)).group_by(Order.phone_e164).all()}
    )
    period_orders = _orders_between(db, start, end).all()
    period_customers = {o.phone_e164 for o in period_orders}
    returning = sum(1 for phone in period_customers if orders_per_phone[phone] > 1)
    total_customers = len(period_customers)
    revenue = sum(o.total_mad for o in period_orders)
    return StoreCustomerAnalytics(
        total_customers=total_customers,
        new_customers=max(total_customers - returning, 0),
        returning_customers=returning,
        repeat_purchase_rate=_pct(returning, total_customers),
        customer_lifetime_value_mad=round(revenue / total_customers, 2) if total_customers else 0,
        average_orders_per_customer=round(len(period_orders) / total_customers, 2) if total_customers else 0,
    )


def _cod(m: dict) -> StoreCodAnalytics:
    orders = m["orders"]
    confirmed = m["confirmed"]
    shipped = m["shipped"]
    delivered = m["delivered"]
    return StoreCodAnalytics(
        cod_orders=orders,
        confirmation_rate=_pct(confirmed, orders),
        shipping_rate=_pct(shipped, confirmed),
        delivery_rate=_pct(delivered, shipped),
        cancellation_rate=_pct(m["cancelled"], orders),
        return_rate=_pct(m["returned"], shipped),
        fake_order_rate=_pct(m["cancelled"], orders),
        confirmed_over_total=_pct(confirmed, orders),
        delivered_over_confirmed=_pct(delivered, confirmed),
        delivered_over_total=_pct(delivered, orders),
    )


def _realtime(db: Session, now: datetime) -> StoreRealtimeAnalytics:
    today = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    hour = now - timedelta(hours=1)
    active_since = now - timedelta(minutes=10)
    active = int(db.query(func.count(distinct(ProductLinkClick.visitor_hash))).filter(ProductLinkClick.created_at >= active_since).scalar() or 0)
    today_orders = _orders_between(db, today, now).all()
    hour_orders = _orders_between(db, hour, now).all()
    return StoreRealtimeAnalytics(
        active_visitors=active,
        orders_today=len(today_orders),
        orders_this_hour=len(hour_orders),
        revenue_today_mad=sum(o.total_mad for o in today_orders),
        revenue_this_hour_mad=sum(o.total_mad for o in hour_orders),
    )


def _pct(part: int | float, whole: int | float) -> float:
    return round((part / whole) * 100, 2) if whole else 0.0
