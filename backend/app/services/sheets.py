from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.orders import get_order, order_sheet_payload


async def sync_order_to_sheet(order_id: str, db_factory) -> None:
    settings = get_settings()
    if not settings.sheets_webhook_url or not settings.sheets_webhook_secret:
        _mark_skipped(order_id, db_factory, "Sheets webhook not configured")
        return

    db: Session = db_factory()
    try:
        order = get_order(db, order_id)
        if not order:
            return
        payload = {
            "secret": settings.sheets_webhook_secret,
            "action": "upsert_order",
            "order": order_sheet_payload(order),
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(settings.sheets_webhook_url, json=payload)
            response.raise_for_status()
        order.sheet_sync_status = "synced"
        order.sheet_last_error = None
        order.sheet_synced_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        order = get_order(db, order_id)
        if order:
            order.sheet_sync_status = "failed"
            order.sheet_last_error = str(exc)
            db.commit()
    finally:
        db.close()


def _mark_skipped(order_id: str, db_factory, reason: str) -> None:
    db: Session = db_factory()
    try:
        order = get_order(db, order_id)
        if order:
            order.sheet_sync_status = "skipped"
            order.sheet_last_error = reason
            db.commit()
    finally:
        db.close()
