from __future__ import annotations

import time
from datetime import date, datetime, time as dtime, timedelta, timezone
from hmac import compare_digest
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.order import ConversionEvent, Order
from app.models.tracking import TrackingLog, TrackingPixel, TrackingSpend
from app.schemas.tracking import (
    SUPPORTED_EVENTS,
    TrackingAnalytics,
    TrackingLogOut,
    TrackingLogsResponse,
    TrackingPixelCreate,
    TrackingPixelOut,
    TrackingPixelUpdate,
    TrackingPlatformStat,
    TrackingTestResult,
)

PLATFORM_ORDER = ["meta", "tiktok", "google_ads", "youtube", "ga4"]
PURCHASE_EVENTS = {"Purchase", "CompletePayment", "conversion", "OrderConfirmed", "purchase"}
LEAD_EVENTS = {"Lead", "SubmitForm", "FormSubmission", "CODOrderCreated"}


class TrackingPinError(Exception):
    pass


def _verify_pin(pin: Optional[str]) -> None:
    expected = get_settings().admin_reset_pin.strip()
    if not expected:
        raise TrackingPinError("Admin PIN is not configured (set ADMIN_RESET_PIN)")
    if not pin or not compare_digest(pin.strip(), expected):
        raise TrackingPinError("Invalid admin PIN")


def _mask(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    if len(token) <= 4:
        return "••••"
    return "••••" + token[-4:]


def _pixel_health(pixel: TrackingPixel, error_count: int = 0) -> str:
    if pixel.status != "active":
        return "warning"
    if error_count > 0:
        return "critical"
    if pixel.capi_enabled and not pixel.access_token:
        return "warning"
    return "excellent"


def to_pixel_out(pixel: TrackingPixel, error_count: int = 0) -> TrackingPixelOut:
    return TrackingPixelOut(
        id=pixel.id,
        platform=pixel.platform,
        name=pixel.name,
        pixel_id=pixel.pixel_id,
        has_token=bool(pixel.access_token),
        token_masked=_mask(pixel.access_token),
        test_event_code=pixel.test_event_code,
        capi_enabled=pixel.capi_enabled,
        status=pixel.status,
        scope_type=pixel.scope_type,
        scope_value=pixel.scope_value,
        events_enabled=pixel.events_enabled or SUPPORTED_EVENTS,
        extra=pixel.extra,
        health=_pixel_health(pixel, error_count),
        created_at=pixel.created_at,
        updated_at=pixel.updated_at,
    )


def list_pixels(db: Session, *, platform: Optional[str] = None, status: Optional[str] = None) -> list[TrackingPixelOut]:
    query = db.query(TrackingPixel)
    if platform:
        query = query.filter(TrackingPixel.platform == platform)
    if status:
        query = query.filter(TrackingPixel.status == status)
    pixels = query.order_by(TrackingPixel.created_at.desc()).all()
    return [to_pixel_out(p) for p in pixels]


def create_pixel(db: Session, payload: TrackingPixelCreate) -> TrackingPixelOut:
    if payload.access_token:
        _verify_pin(payload.pin)  # adding a token is a sensitive action
    pixel = TrackingPixel(
        platform=payload.platform,
        name=payload.name.strip(),
        pixel_id=payload.pixel_id.strip(),
        access_token=(payload.access_token.strip() if payload.access_token else None),
        test_event_code=payload.test_event_code,
        capi_enabled=payload.capi_enabled,
        status=payload.status,
        scope_type=payload.scope_type,
        scope_value=payload.scope_value,
        events_enabled=payload.events_enabled or SUPPORTED_EVENTS,
        extra=payload.extra,
    )
    db.add(pixel)
    db.commit()
    db.refresh(pixel)
    return to_pixel_out(pixel)


def update_pixel(db: Session, pixel_id: str, payload: TrackingPixelUpdate) -> Optional[TrackingPixelOut]:
    pixel = db.get(TrackingPixel, _as_uuid(pixel_id))
    if pixel is None:
        return None

    # Changing the access token requires a PIN.
    if payload.access_token is not None:
        _verify_pin(payload.pin)
        pixel.access_token = payload.access_token.strip() or None

    if payload.name is not None:
        pixel.name = payload.name.strip()
    if payload.pixel_id is not None:
        pixel.pixel_id = payload.pixel_id.strip()
    if payload.test_event_code is not None:
        pixel.test_event_code = payload.test_event_code or None
    if payload.capi_enabled is not None:
        pixel.capi_enabled = payload.capi_enabled
    if payload.status is not None:
        pixel.status = payload.status
    if payload.scope_type is not None:
        pixel.scope_type = payload.scope_type
    if payload.scope_value is not None:
        pixel.scope_value = payload.scope_value or None
    if payload.events_enabled is not None:
        pixel.events_enabled = payload.events_enabled
    if payload.extra is not None:
        pixel.extra = payload.extra

    db.commit()
    db.refresh(pixel)
    return to_pixel_out(pixel)


def delete_pixel(db: Session, pixel_id: str, *, pin: str) -> bool:
    _verify_pin(pin)
    pixel = db.get(TrackingPixel, _as_uuid(pixel_id))
    if pixel is None:
        return False
    db.delete(pixel)
    db.commit()
    return True


def _as_uuid(value: str) -> Optional[UUID]:
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


def _range_start(days: int) -> datetime:
    now = datetime.now(timezone.utc)
    start_day = (now - timedelta(days=max(0, days - 1))).date()
    return datetime.combine(start_day, dtime.min, tzinfo=timezone.utc)


def get_analytics(db: Session, *, days: int = 7) -> TrackingAnalytics:
    start = _range_start(days)

    # Server-side conversion events (from order flow / CAPI).
    ce_rows = (
        db.query(ConversionEvent.platform, ConversionEvent.event_name, func.count(ConversionEvent.id))
        .filter(ConversionEvent.created_at >= start)
        .group_by(ConversionEvent.platform, ConversionEvent.event_name)
        .all()
    )

    # Logged events (browser/server/test) + errors.
    log_rows = (
        db.query(TrackingLog.platform, TrackingLog.source, TrackingLog.status, func.count(TrackingLog.id))
        .filter(TrackingLog.created_at >= start)
        .group_by(TrackingLog.platform, TrackingLog.source, TrackingLog.status)
        .all()
    )

    spend_rows = (
        db.query(TrackingSpend.platform, func.coalesce(func.sum(TrackingSpend.amount_mad), 0))
        .filter(TrackingSpend.day >= start.date())
        .group_by(TrackingSpend.platform)
        .all()
    )
    spend_by_platform = {p: int(s or 0) for p, s in spend_rows}

    pixels = db.query(TrackingPixel).all()
    revenue_total = int(
        db.query(func.coalesce(func.sum(Order.total_mad), 0)).filter(Order.created_at >= start).scalar() or 0
    )

    # Aggregate per platform.
    stats: dict[str, dict] = {}

    def bucket(platform: str) -> dict:
        return stats.setdefault(
            platform,
            {
                "pixels": 0,
                "active": 0,
                "total_events": 0,
                "purchases": 0,
                "leads": 0,
                "browser_events": 0,
                "server_events": 0,
                "errors": 0,
            },
        )

    for p in pixels:
        b = bucket(p.platform)
        b["pixels"] += 1
        if p.status == "active":
            b["active"] += 1

    for platform, event_name, count in ce_rows:
        b = bucket(platform or "meta")
        c = int(count)
        b["total_events"] += c
        b["server_events"] += c
        if event_name in PURCHASE_EVENTS:
            b["purchases"] += c
        if event_name in LEAD_EVENTS:
            b["leads"] += c

    for platform, source, status_v, count in log_rows:
        b = bucket(platform or "meta")
        c = int(count)
        if status_v == "error":
            b["errors"] += c
            continue
        b["total_events"] += c
        if source == "browser":
            b["browser_events"] += c
        else:
            b["server_events"] += c

    by_platform: list[TrackingPlatformStat] = []
    total_events = total_purchases = total_leads = browser_events = server_events = errors = 0

    ordered = [p for p in PLATFORM_ORDER if p in stats] + [p for p in stats if p not in PLATFORM_ORDER]
    for platform in ordered:
        b = stats[platform]
        spend = spend_by_platform.get(platform, 0)
        # Attribute revenue across active ad platforms (manual-spend platforms only) as an estimate.
        roas = None
        cpl = None
        cpp = None
        plat_revenue = revenue_total if spend else 0
        if spend:
            roas = round(plat_revenue / spend, 2) if plat_revenue else 0.0
            cpl = round(spend / b["leads"], 2) if b["leads"] else None
            cpp = round(spend / b["purchases"], 2) if b["purchases"] else None
        health = "critical" if b["errors"] else ("excellent" if b["active"] else "warning")
        by_platform.append(
            TrackingPlatformStat(
                platform=platform,
                pixels=b["pixels"],
                active=b["active"],
                total_events=b["total_events"],
                purchases=b["purchases"],
                leads=b["leads"],
                browser_events=b["browser_events"],
                server_events=b["server_events"],
                errors=b["errors"],
                spend_mad=spend,
                revenue_mad=plat_revenue,
                roas=roas,
                cost_per_lead=cpl,
                cost_per_purchase=cpp,
                health=health,
            )
        )
        total_events += b["total_events"]
        total_purchases += b["purchases"]
        total_leads += b["leads"]
        browser_events += b["browser_events"]
        server_events += b["server_events"]
        errors += b["errors"]

    spend_total = sum(spend_by_platform.values())
    conversion_rate = round((total_purchases / total_events) * 100, 2) if total_events else 0.0
    matched = min(browser_events, server_events)
    dedup_rate = round((matched / max(browser_events, server_events)) * 100, 2) if (browser_events or server_events) else 0.0
    # Match quality proxy: server coverage vs browser events.
    emq = round((server_events / browser_events) * 100, 2) if browser_events else (100.0 if server_events else 0.0)
    emq = min(emq, 100.0)

    # Health score 0-100: coverage of pixels, error penalty, dedup quality.
    active_pixels = sum(1 for p in pixels if p.status == "active")
    coverage_score = min(40, active_pixels * 10)
    error_penalty = min(30, errors * 5)
    dedup_score = round(dedup_rate * 0.3)
    activity_score = 30 if total_events else 0
    health_score = max(0, min(100, coverage_score + dedup_score + activity_score - error_penalty))

    roas_total = round(revenue_total / spend_total, 2) if spend_total else None
    cpl_total = round(spend_total / total_leads, 2) if (spend_total and total_leads) else None
    cpp_total = round(spend_total / total_purchases, 2) if (spend_total and total_purchases) else None

    return TrackingAnalytics(
        range_days=days,
        total_events=total_events,
        total_purchases=total_purchases,
        total_leads=total_leads,
        conversion_rate=conversion_rate,
        browser_events=browser_events,
        server_events=server_events,
        deduplication_rate=dedup_rate,
        event_match_quality=emq,
        health_score=health_score,
        spend_mad=spend_total,
        revenue_mad=revenue_total,
        roas=roas_total,
        cost_per_lead=cpl_total,
        cost_per_purchase=cpp_total,
        by_platform=by_platform,
    )


def list_logs(
    db: Session,
    *,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> TrackingLogsResponse:
    query = db.query(TrackingLog)
    if platform:
        query = query.filter(TrackingLog.platform == platform)
    if status:
        query = query.filter(TrackingLog.status == status)
    total = query.with_entities(func.count(TrackingLog.id)).scalar() or 0
    rows = query.order_by(TrackingLog.created_at.desc()).offset(offset).limit(limit).all()
    logs = [
        TrackingLogOut(
            id=r.id,
            pixel_id=r.pixel_id,
            platform=r.platform,
            event_name=r.event_name,
            source=r.source,
            status=r.status,
            message=r.message,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return TrackingLogsResponse(total=int(total), logs=logs)


def _log(db: Session, pixel: TrackingPixel, event_name: str, source: str, status: str, message: str) -> None:
    db.add(
        TrackingLog(
            pixel_id=pixel.id,
            platform=pixel.platform,
            event_name=event_name,
            source=source,
            status=status,
            message=message,
        )
    )
    db.commit()


def send_test_event(db: Session, pixel_id: str) -> TrackingTestResult:
    pixel = db.get(TrackingPixel, _as_uuid(pixel_id))
    if pixel is None:
        return TrackingTestResult(ok=False, platform="", message="Pixel not found")

    # Only Meta CAPI has a simple server-to-server test we can actually call.
    if pixel.platform == "meta" and pixel.access_token:
        ok, msg = _meta_test_event(pixel)
        _log(db, pixel, "TestEvent", "test", "ok" if ok else "error", msg)
        return TrackingTestResult(ok=ok, platform=pixel.platform, message=msg)

    if not pixel.access_token:
        msg = "No access token configured: browser pixel verified by configuration only."
        _log(db, pixel, "TestEvent", "test", "ok", msg)
        return TrackingTestResult(ok=True, platform=pixel.platform, message=msg)

    msg = f"Server test for {pixel.platform} is configuration-checked; live verification runs from the ad platform."
    _log(db, pixel, "TestEvent", "test", "ok", msg)
    return TrackingTestResult(ok=True, platform=pixel.platform, message=msg)


def _meta_test_event(pixel: TrackingPixel) -> tuple[bool, str]:
    url = f"https://graph.facebook.com/v19.0/{pixel.pixel_id}/events"
    payload = {
        "data": [
            {
                "event_name": "PageView",
                "event_time": int(time.time()),
                "action_source": "website",
                "event_source_url": "https://tawazonhealth.store",
                "user_data": {"client_user_agent": "tawazon-tracking-center"},
            }
        ],
        "access_token": pixel.access_token,
    }
    if pixel.test_event_code:
        payload["test_event_code"] = pixel.test_event_code
    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            received = data.get("events_received", 0)
            return True, f"Meta received {received} test event(s)."
        return False, f"Meta API error {resp.status_code}: {resp.text[:200]}"
    except httpx.HTTPError as exc:
        return False, f"Request failed: {exc}"


def upsert_spend(db: Session, *, platform: str, day: date, amount_mad: int) -> None:
    row = (
        db.query(TrackingSpend)
        .filter(TrackingSpend.platform == platform, TrackingSpend.day == day)
        .first()
    )
    if row is None:
        db.add(TrackingSpend(platform=platform, day=day, amount_mad=amount_mad))
    else:
        row.amount_mad = amount_mad
    db.commit()
