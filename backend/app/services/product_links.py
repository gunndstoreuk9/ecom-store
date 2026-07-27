from __future__ import annotations

import hashlib
import re
import uuid
from datetime import datetime, time, timedelta, timezone
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import Request
from sqlalchemy import distinct, func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.order import Order
from app.models.product_link import ProductLink, ProductLinkClick
from app.schemas.product_links import (
    ProductLinkCreate,
    ProductLinkOut,
    ProductLinkStats,
    ProductLinkUpdate,
    ProductLinksResponse,
)
from app.services.tracking_center import TrackingPinError, _verify_pin


CONFIRMED_STATUSES = {"confirmed", "packed", "dispatched", "shipped", "delivered", "returned", "refused"}
DELIVERED_STATUSES = {"delivered"}


def _slugify(value: str) -> str:
    raw = value.strip().lower()
    raw = re.sub(r"[^a-z0-9]+", "-", raw)
    raw = re.sub(r"-+", "-", raw).strip("-")
    return raw[:70] or f"link-{uuid.uuid4().hex[:8]}"


def _unique_slug(db: Session, base: str) -> str:
    slug = _slugify(base)
    candidate = slug
    i = 2
    while db.query(ProductLink.id).filter(ProductLink.slug == candidate).first():
        suffix = f"-{i}"
        candidate = f"{slug[:80 - len(suffix)]}{suffix}"
        i += 1
    return candidate


def _start_for_days(days: int) -> datetime:
    now = datetime.now(timezone.utc)
    start_day = (now - timedelta(days=max(0, days - 1))).date()
    return datetime.combine(start_day, time.min, tzinfo=timezone.utc)


def _public_url(slug: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/l/{slug}"


def _stats_for(db: Session, link: ProductLink, start: Optional[datetime]) -> ProductLinkStats:
    click_query = db.query(ProductLinkClick).filter(ProductLinkClick.link_id == link.id)
    if start is not None:
        click_query = click_query.filter(ProductLinkClick.created_at >= start)

    total_clicks = click_query.with_entities(func.count(ProductLinkClick.id)).scalar() or 0
    total_visitors = click_query.with_entities(func.count(distinct(ProductLinkClick.visitor_hash))).scalar() or 0

    order_query = db.query(Order).filter(
        or_(
            Order.utm["product_link_id"].astext == str(link.id),
            Order.utm["product_link_slug"].astext == link.slug,
        )
    )
    if start is not None:
        order_query = order_query.filter(Order.created_at >= start)

    total_orders = order_query.with_entities(func.count(Order.id)).scalar() or 0
    confirmed_orders = (
        order_query.filter(Order.status.in_(CONFIRMED_STATUSES)).with_entities(func.count(Order.id)).scalar() or 0
    )
    delivered_orders = (
        order_query.filter(Order.status.in_(DELIVERED_STATUSES)).with_entities(func.count(Order.id)).scalar() or 0
    )
    conversion_rate = round((total_orders / total_visitors) * 100, 2) if total_visitors else 0
    return ProductLinkStats(
        total_clicks=int(total_clicks),
        total_visitors=int(total_visitors),
        total_orders=int(total_orders),
        confirmed_orders=int(confirmed_orders),
        delivered_orders=int(delivered_orders),
        conversion_rate=conversion_rate,
    )


def to_out(db: Session, link: ProductLink, start: Optional[datetime]) -> ProductLinkOut:
    return ProductLinkOut(
        id=link.id,
        slug=link.slug,
        public_url=_public_url(link.slug),
        name=link.name,
        full_url=link.full_url,
        product_name=link.product_name,
        platform=link.platform,
        campaign_name=link.campaign_name,
        ad_account_name=link.ad_account_name,
        notes=link.notes,
        status=link.status,
        created_at=link.created_at,
        updated_at=link.updated_at,
        archived_at=link.archived_at,
        stats=_stats_for(db, link, start),
    )


def list_links(
    db: Session,
    *,
    q: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    days: int = 30,
) -> ProductLinksResponse:
    query = db.query(ProductLink)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                ProductLink.name.ilike(like),
                ProductLink.full_url.ilike(like),
                ProductLink.product_name.ilike(like),
                ProductLink.campaign_name.ilike(like),
                ProductLink.ad_account_name.ilike(like),
            )
        )
    if platform:
        query = query.filter(ProductLink.platform == platform)
    if status:
        query = query.filter(ProductLink.status == status)
    total = query.with_entities(func.count(ProductLink.id)).scalar() or 0
    links = query.order_by(ProductLink.created_at.desc()).all()
    start = _start_for_days(days)
    return ProductLinksResponse(total=int(total), links=[to_out(db, link, start) for link in links])


def create_link(db: Session, payload: ProductLinkCreate) -> ProductLinkOut:
    slug = _unique_slug(db, payload.slug or payload.name)
    link = ProductLink(
        slug=slug,
        name=payload.name.strip(),
        full_url=payload.full_url.strip(),
        product_name=payload.product_name.strip(),
        platform=payload.platform,
        campaign_name=(payload.campaign_name or "").strip() or None,
        ad_account_name=(payload.ad_account_name or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        status=payload.status,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return to_out(db, link, _start_for_days(30))


def update_link(db: Session, link_id: str, payload: ProductLinkUpdate) -> Optional[ProductLinkOut]:
    link = _get_link(db, link_id)
    if link is None:
        return None
    for field in ["name", "full_url", "product_name", "platform", "campaign_name", "ad_account_name", "notes", "status"]:
        value = getattr(payload, field)
        if value is not None:
            setattr(link, field, value.strip() if isinstance(value, str) else value)
    if link.status == "archived" and link.archived_at is None:
        link.archived_at = datetime.now(timezone.utc)
    if link.status != "archived":
        link.archived_at = None
    db.commit()
    db.refresh(link)
    return to_out(db, link, _start_for_days(30))


def duplicate_link(db: Session, link_id: str) -> Optional[ProductLinkOut]:
    link = _get_link(db, link_id)
    if link is None:
        return None
    copy = ProductLink(
        slug=_unique_slug(db, f"{link.slug}-copy"),
        name=f"{link.name} Copy",
        full_url=link.full_url,
        product_name=link.product_name,
        platform=link.platform,
        campaign_name=link.campaign_name,
        ad_account_name=link.ad_account_name,
        notes=link.notes,
        status="active",
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return to_out(db, copy, _start_for_days(30))


def delete_link(db: Session, link_id: str, *, pin: str) -> bool:
    _verify_pin(pin)
    link = _get_link(db, link_id)
    if link is None:
        return False
    db.delete(link)
    db.commit()
    return True


def bulk_action(db: Session, ids: list[uuid.UUID], action: str, pin: Optional[str]) -> int:
    links = db.query(ProductLink).filter(ProductLink.id.in_(ids)).all()
    if action == "delete":
        _verify_pin(pin)
        for link in links:
            db.delete(link)
    elif action in {"active", "disabled", "archived"}:
        now = datetime.now(timezone.utc)
        for link in links:
            link.status = action
            link.archived_at = now if action == "archived" else None
    else:
        raise ValueError("Unsupported bulk action")
    db.commit()
    return len(links)


def resolve_and_track(db: Session, slug: str, request: Request) -> Optional[str]:
    link = db.query(ProductLink).filter(ProductLink.slug == slug, ProductLink.status == "active").first()
    if link is None:
        return None

    ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    visitor_hash = hashlib.sha256(f"{ip}|{user_agent}".encode("utf-8")).hexdigest()
    ip_hash = hashlib.sha256(ip.encode("utf-8")).hexdigest() if ip else None
    db.add(
        ProductLinkClick(
            link_id=link.id,
            visitor_hash=visitor_hash,
            ip_hash=ip_hash,
            user_agent=user_agent,
            referer=request.headers.get("referer"),
        )
    )
    db.commit()
    return _with_tracking_params(link.full_url, link)


def _with_tracking_params(url: str, link: ProductLink) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(
        {
            "product_link_id": str(link.id),
            "product_link_slug": link.slug,
            "utm_source": query.get("utm_source") or link.platform,
            "utm_campaign": query.get("utm_campaign") or link.campaign_name or link.name,
        }
    )
    return urlunparse(parsed._replace(query=urlencode(query)))


def _get_link(db: Session, link_id: str) -> Optional[ProductLink]:
    try:
        parsed = uuid.UUID(str(link_id))
    except (TypeError, ValueError):
        return None
    return db.get(ProductLink, parsed)
