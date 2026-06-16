"""Digylog delivery integration (Api Seller v2.5).

Docs: https://documenter.getpostman.com/view/20928347/2sBXqNoKfH
Create order endpoint: POST https://api.digylog.com/api/v2/seller/orders

Enable by setting (Easypanel backend env):
    DIGYLOG_API_TOKEN   your seller API token (required to enable)
    DIGYLOG_STORE       store name or id (from /stores) — recommended
    DIGYLOG_NETWORK     network id (from /networks), default 1
    DIGYLOG_PORT        shipping paid by — 1: customer, 2: seller (default 1)
    DIGYLOG_ADD_STATUS  0: add only, 1: add & send to delivery (default 1)

When DIGYLOG_API_TOKEN is empty, dispatch falls back to CSV export only.
"""

from __future__ import annotations

from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.order import Order


class DigylogError(Exception):
    pass


# Maps Digylog numeric status ids (GET /statuses) to our internal order statuses.
# Unmapped ids leave the order status unchanged.
DIGYLOG_STATUS_MAP = {
    1: "shipped",
    2: "shipped",
    3: "shipped",
    4: "no_answer",
    5: "shipped",
    6: "delivered",
    7: "cancelled",
    8: "returned",
    9: "refused",
    10: "returned",
    11: "returned",
    13: "cancelled",
    14: "shipped",
    15: "shipped",
    16: "shipped",
    17: "shipped",
    18: "shipped",
    19: "shipped",
    20: "awaiting_confirmation",
    21: "no_answer",
    22: "no_answer",
    23: "shipped",
    24: "cancelled",
    25: "cancelled",
    26: "confirmed",
    30: "returned",
    31: "shipped",
    32: "returned",
    38: "cancelled",
    39: "shipped",
    40: "returned",
    41: "returned",
    42: "returned",
    43: "no_answer",
    44: "shipped",
    45: "delivered",
    46: "cancelled",
    47: "refused",
    49: "shipped",
    50: "shipped",
    51: "returned",
    52: "cancelled",
    53: "shipped",
    54: "shipped",
    55: "cancelled",
}


def apply_webhook_event(db: Session, body: dict) -> dict:
    """Apply a Digylog webhook event. Returns a small status dict for the response."""
    event_type = (body or {}).get("type")
    if event_type != "order-status-changed":
        # Acknowledge other event types (new-br, stock-diff) without acting.
        return {"ok": True, "ignored": event_type or "unknown"}

    payload = body.get("payload") or {}
    num = (payload.get("num") or "").strip()
    tracking = (payload.get("traking") or payload.get("tracking") or "").strip()

    order = None
    if num:
        order = db.query(Order).filter(Order.public_order_number == num).first()
    if order is None and tracking:
        order = db.query(Order).filter(Order.delivery_tracking == tracking).first()
    if order is None:
        return {"ok": True, "matched": False}

    if tracking and not order.delivery_tracking:
        order.delivery_tracking = tracking

    mapped = None
    raw_id = payload.get("idStatus")
    try:
        mapped = DIGYLOG_STATUS_MAP.get(int(raw_id)) if raw_id is not None else None
    except (TypeError, ValueError):
        mapped = None
    if mapped:
        order.status = mapped

    db.commit()
    return {"ok": True, "matched": True, "status": mapped}


def _local_phone(order: Order) -> str:
    """Digylog expects a local Moroccan number (e.g. 0612345678)."""
    if order.phone_local:
        return order.phone_local
    e164 = (order.phone_e164 or "").replace("+", "")
    if e164.startswith("212"):
        return "0" + e164[3:]
    return e164


def build_order_entry(order: Order) -> dict:
    designation = order.items[0].name_ar if order.items else order.hero_sku
    return {
        "num": order.public_order_number,
        "type": 1,
        "name": order.customer_name,
        "phone": _local_phone(order),
        "address": order.address or order.delivery_city or order.city or "",
        "city": order.delivery_city or order.city or "",
        "price": order.total_mad,
        "openproduct": 1,
        "port": get_settings().digylog_port,
        "note": order.call_note or "",
        "refs": [{"designation": designation, "quantity": order.hero_qty}],
    }


def build_digylog_payload(order: Order) -> dict:
    settings = get_settings()
    body: dict = {
        "mode": 1,
        "network": settings.digylog_network,
        "fc": 0,
        "status": settings.digylog_add_status,
        "checkDuplicate": 1,
        "orders": [build_order_entry(order)],
    }
    if settings.digylog_store:
        body["store"] = settings.digylog_store
    return body


def _extract_tracking(data: object, order_num: str) -> Optional[str]:
    """Find a tracking reference in the (loosely specified) response."""
    keys = ("tracking", "traking", "trackingNumber", "code", "barcode", "ref", "reference")

    def search(node: object) -> Optional[str]:
        if isinstance(node, dict):
            # Prefer the entry matching our order number when present.
            if node.get("num") == order_num:
                for k in keys:
                    if node.get(k):
                        return str(node[k])
            for k in keys:
                if node.get(k):
                    return str(node[k])
            for v in node.values():
                found = search(v)
                if found:
                    return found
        elif isinstance(node, list):
            for v in node:
                found = search(v)
                if found:
                    return found
        return None

    return search(data)


def _extract_errors(data: object, order_num: str) -> list[str]:
    errors: list[str] = []

    def visit(node: object) -> None:
        if isinstance(node, dict):
            if node.get("num") == order_num and isinstance(node.get("errors"), list):
                errors.extend(str(item) for item in node["errors"])
            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)

    visit(data)
    return errors


def _human_digylog_error(data: object, order: Order) -> str:
    raw_errors = _extract_errors(data, order.public_order_number)
    joined = " ".join(raw_errors).lower()
    if "liste noire" in joined or "blacklist" in joined:
        return f"هذا الرقم موجود في القائمة السوداء لدى Digylog ولا يمكن إرساله: {order.phone_local or order.phone_e164}"
    if raw_errors:
        return "رفضت Digylog هذا الطلب: " + " | ".join(raw_errors)
    return "قبلت Digylog الطلب ولكن لم ترجع رقم تتبع. راجع الطلب داخل منصة Digylog."


def push_order_to_digylog(order: Order) -> Optional[str]:
    """Create (and send) an order on Digylog. Returns a tracking ref if provided.

    Raises DigylogError on failure so the caller can record it.
    """
    settings = get_settings()
    if not settings.digylog_api_url or not settings.digylog_api_token:
        raise DigylogError("Digylog API not configured")

    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.digylog_referer:
        headers["Referer"] = settings.digylog_referer
    headers[settings.digylog_auth_header] = f"{settings.digylog_auth_prefix}{settings.digylog_api_token}"

    payload = build_digylog_payload(order)
    try:
        with httpx.Client(timeout=20, follow_redirects=True) as client:
            response = client.post(settings.digylog_api_url, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        preview = exc.response.text[:400].replace("\n", " ")
        raise DigylogError(f"Digylog rejected order ({exc.response.status_code}): {preview}") from exc
    except httpx.HTTPError as exc:
        raise DigylogError(f"Digylog request failed: {exc}") from exc

    try:
        data = response.json()
    except ValueError:
        preview = response.text[:400].replace("\n", " ")
        raise DigylogError(f"Digylog returned a non-JSON response: {preview}")

    tracking = _extract_tracking(data, order.public_order_number)
    if not tracking:
        raise DigylogError(_human_digylog_error(data, order))
    return tracking
