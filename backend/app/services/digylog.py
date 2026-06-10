"""Digylog delivery integration.

Digylog does not publish a public API. Once you obtain API access from Digylog
(endpoint URL + token + payload spec), set the env vars below and, if needed,
adjust the payload field names in `build_digylog_payload` to match their spec:

    DIGYLOG_API_URL      e.g. https://pml.digylog.com/api/parcels
    DIGYLOG_API_TOKEN    your seller API token
    DIGYLOG_AUTH_HEADER  default: Authorization
    DIGYLOG_AUTH_PREFIX  default: "Bearer " (use "" or "Token " if required)

When DIGYLOG_API_URL is empty, dispatch falls back to CSV export only.
"""

from __future__ import annotations

from typing import Optional

import httpx

from app.core.config import get_settings
from app.models.order import Order


class DigylogError(Exception):
    pass


def build_digylog_payload(order: Order) -> dict:
    """Map an order to the data Digylog needs.

    NOTE: rename these keys to match Digylog's real API spec when available.
    """
    product = order.items[0].name_ar if order.items else order.hero_sku
    return {
        "reference": order.public_order_number,
        "product": product,
        "quantity": order.hero_qty,
        "customer": order.customer_name,
        "phone": order.phone_e164,
        "address": order.address or "",
        "city": order.delivery_city or order.city or "",
        "price": order.total_mad,
        "comment": order.call_note or "",
    }


def push_order_to_digylog(order: Order) -> Optional[str]:
    """Send an order to Digylog. Returns a tracking reference if provided.

    Raises DigylogError on failure so the caller can record it.
    """
    settings = get_settings()
    if not settings.digylog_api_url:
        raise DigylogError("Digylog API not configured")

    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.digylog_api_token:
        headers[settings.digylog_auth_header] = f"{settings.digylog_auth_prefix}{settings.digylog_api_token}"

    payload = build_digylog_payload(order)
    try:
        with httpx.Client(timeout=15, follow_redirects=True) as client:
            response = client.post(settings.digylog_api_url, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        preview = exc.response.text[:300].replace("\n", " ")
        raise DigylogError(f"Digylog rejected order ({exc.response.status_code}): {preview}") from exc
    except httpx.HTTPError as exc:
        raise DigylogError(f"Digylog request failed: {exc}") from exc

    try:
        data = response.json()
    except ValueError:
        return None
    # Try common keys for a tracking/parcel reference; adjust to Digylog's spec.
    for key in ("tracking", "tracking_number", "code", "barcode", "parcel_code", "id", "reference"):
        value = data.get(key) if isinstance(data, dict) else None
        if value:
            return str(value)
    return None
