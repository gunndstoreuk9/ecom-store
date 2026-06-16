from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.models.order import ConversionEvent, Order
from app.models.tracking import TrackingLog, TrackingPixel


def create_noop_conversion_events(db: Session, order: Order) -> None:
    """Store placeholders so CAPI integrations can be enabled without changing order flow."""
    for platform, event_name in [("meta", "Lead"), ("tiktok", "CompletePayment"), ("google", "conversion")]:
        db.add(
            ConversionEvent(
                order_id=order.id,
                platform=platform,
                event_name=event_name,
                event_id=order.event_id,
                payload_json={"order_id": str(order.id), "value": order.total_mad, "currency": order.currency},
                status="skipped",
                response_json={"reason": "credentials_not_configured"},
                attempt_count=0,
            )
        )
    db.commit()


def send_order_tracking_events(order_id: str, session_factory: sessionmaker) -> None:
    db = session_factory()
    try:
        order = _get_order(db, order_id)
        if order is None:
            return
        _record_skipped_event(db, order, "meta", "Lead", "not_implemented")
        _send_tiktok_complete_payment(db, order)
        _record_skipped_event(db, order, "google", "conversion", "not_implemented")
    finally:
        db.close()


def _get_order(db: Session, order_id: str) -> Order | None:
    try:
        return db.get(Order, UUID(order_id))
    except (TypeError, ValueError):
        return None


def _record_skipped_event(db: Session, order: Order, platform: str, event_name: str, reason: str) -> None:
    db.add(
        ConversionEvent(
            order_id=order.id,
            platform=platform,
            event_name=event_name,
            event_id=order.event_id,
            payload_json={"order_id": str(order.id), "value": order.total_mad, "currency": order.currency},
            status="skipped",
            response_json={"reason": reason},
            attempt_count=0,
        )
    )
    db.commit()


def _send_tiktok_complete_payment(db: Session, order: Order) -> None:
    pixels = _tiktok_pixels(db)
    if not pixels:
        _record_skipped_event(db, order, "tiktok", "CompletePayment", "tiktok_pixel_or_token_not_configured")
        return

    for pixel in pixels:
        event = ConversionEvent(
            order_id=order.id,
            platform="tiktok",
            event_name="CompletePayment",
            event_id=order.event_id or str(order.id),
            payload_json=_tiktok_payload(pixel.pixel_id, order),
            status="pending",
            attempt_count=1,
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        ok, response = _post_tiktok_event(pixel, event.payload_json or {})
        event.status = "sent" if ok else "error"
        event.response_json = response
        event.sent_at = datetime.now(timezone.utc) if ok else None
        event.last_error = None if ok else str(response)[:2000]
        _log_tracking(db, pixel, "CompletePayment", "server", "ok" if ok else "error", str(response)[:2000])
        db.commit()


def _tiktok_pixels(db: Session) -> list[TrackingPixel]:
    pixels = (
        db.query(TrackingPixel)
        .filter(
            TrackingPixel.platform == "tiktok",
            TrackingPixel.status == "active",
            TrackingPixel.capi_enabled.is_(True),
            TrackingPixel.access_token.isnot(None),
        )
        .all()
    )
    if pixels:
        return pixels

    settings = get_settings()
    if settings.tiktok_pixel_id and settings.tiktok_access_token:
        return [
            TrackingPixel(
                platform="tiktok",
                name="TikTok ENV Pixel",
                pixel_id=settings.tiktok_pixel_id,
                access_token=settings.tiktok_access_token,
                capi_enabled=True,
                status="active",
                scope_type="store",
            )
        ]
    return []


def _tiktok_payload(pixel_code: str, order: Order) -> dict:
    return {
        "pixel_code": pixel_code,
        "event": "CompletePayment",
        "event_id": order.event_id or str(order.id),
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "context": {
            "user": {
                "phone_number": order.phone_hash_tiktok,
                "external_id": order.phone_hash_tiktok,
            },
            "ip": order.client_ip,
            "user_agent": order.user_agent,
            "page": {"url": "https://tawazonhealth.store/products/balance"},
        },
        "properties": {
            "contents": [
                {
                    "content_id": order.hero_sku,
                    "quantity": order.hero_qty,
                    "price": order.total_mad,
                }
            ],
            "content_type": "product",
            "currency": order.currency or "MAD",
            "value": order.total_mad,
        },
    }


def _post_tiktok_event(pixel: TrackingPixel, payload: dict) -> tuple[bool, dict]:
    try:
        with httpx.Client(timeout=10) as client:
            response = client.post(
                "https://business-api.tiktok.com/open_api/v1.3/pixel/track/",
                headers={"Access-Token": pixel.access_token or "", "Content-Type": "application/json"},
                json=payload,
            )
        data = response.json() if response.content else {"status_code": response.status_code}
        ok = response.status_code == 200 and data.get("code") in (0, "0", None)
        return ok, data
    except Exception as exc:
        return False, {"error": str(exc)}


def _log_tracking(db: Session, pixel: TrackingPixel, event_name: str, source: str, status: str, message: str) -> None:
    db.add(
        TrackingLog(
            pixel_id=getattr(pixel, "id", None),
            platform="tiktok",
            event_name=event_name,
            source=source,
            status=status,
            message=message,
        )
    )
