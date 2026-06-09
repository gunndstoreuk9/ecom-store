from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.schemas.order import CreateOrderRequest, OrderDetailResponse, OrderResponse
from app.services.hashing import sha256_hex
from app.services.money import validate_offer
from app.services.phone import (
    meta_phone_hash_input,
    normalize_morocco_phone,
    tiktok_phone_hash_input,
    to_local_morocco_phone,
)


PRODUCT_NAME_AR = "المركّب الأمريكي لضبط السكر — الأصلي"
PRODUCT_SHEET_SKU = "TOPLUX-BSC-940-60"


def create_order(
    db: Session,
    payload: CreateOrderRequest,
    *,
    client_ip: str | None = None,
    user_agent: str | None = None,
) -> Order:
    offer = validate_offer(payload.offer_id, payload.qty, payload.price_mad, payload.sku)
    phone_e164 = normalize_morocco_phone(payload.phone_e164 or payload.phone_raw)
    phone_local = to_local_morocco_phone(phone_e164)

    order = Order(
        public_order_number=_next_public_order_number(db),
        status="new",
        customer_name=payload.name.strip(),
        phone_raw=payload.phone_raw,
        phone_local=phone_local,
        phone_e164=phone_e164,
        phone_hash_meta=sha256_hex(meta_phone_hash_input(phone_e164)),
        phone_hash_tiktok=sha256_hex(tiktok_phone_hash_input(phone_e164)),
        city=payload.city.strip() if payload.city else None,
        hero_sku=payload.sku,
        hero_qty=offer["qty"],
        hero_price_mad=offer["price_mad"],
        subtotal_mad=offer["price_mad"],
        total_mad=offer["price_mad"],
        currency="MAD",
        utm=payload.utm,
        event_id=payload.event_id,
        client_ip=client_ip,
        user_agent=user_agent,
        sheet_sync_status="pending",
    )
    order.items.append(
        OrderItem(
            sku=payload.sku,
            name_ar=PRODUCT_NAME_AR,
            qty=offer["qty"],
            unit_price_mad=offer["price_mad"],
            total_price_mad=offer["price_mad"],
            item_type="hero",
            added_via="direct_cod_form",
        )
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_order(db: Session, order_id: str) -> Order | None:
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        return None
    return db.get(Order, order_uuid)


def to_order_response(order: Order) -> OrderResponse:
    offer_id = _offer_id_from_qty(order.hero_qty)
    return OrderResponse(
        order_id=str(order.id),
        public_order_number=order.public_order_number,
        status=order.status,
        name=order.customer_name,
        phone=order.phone_e164,
        city=order.city,
        offer_id=offer_id,
        qty=order.hero_qty,
        price_mad=order.hero_price_mad,
        total_mad=order.total_mad,
        created_at=order.created_at,
    )


def to_order_detail_response(order: Order) -> OrderDetailResponse:
    base = to_order_response(order).model_dump()
    return OrderDetailResponse(
        **base,
        id=order.id,
        sku=order.hero_sku,
        sheet_sync_status=order.sheet_sync_status,
    )


def order_sheet_payload(order: Order) -> dict:
    created_at = order.created_at or datetime.now(timezone.utc)
    product_skus = [PRODUCT_SHEET_SKU for _ in order.items] or [PRODUCT_SHEET_SKU]
    product_quantities = [str(item.qty) for item in order.items] or [str(order.hero_qty)]

    return {
        "DATE": created_at.strftime("%d/%m/%Y"),
        "SKU": "/".join(product_skus),
        "FULL NAME": order.customer_name,
        "PHONE NUMBER": order.phone_e164.replace("+", ""),
        "CITY": order.city or "",
        "QUANTITY": "/".join(product_quantities),
        "TOTAL PRICE MAD": order.total_mad,
        "STATUS": "",
    }


def _next_public_order_number(db: Session) -> str:
    count = db.query(Order).count() + 10001
    return f"TAWAZON{count}"


def _offer_id_from_qty(qty: int) -> str:
    return {1: "one", 2: "two", 3: "three"}.get(qty, "three")
