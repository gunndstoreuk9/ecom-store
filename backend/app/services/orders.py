from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.schemas.order import CreateOrderRequest, OrderDetailResponse, OrderResponse
from app.services.fraud import evaluate_order_risk
from app.services.hashing import sha256_hex
from app.services.money import validate_offer
from app.services.phone import (
    meta_phone_hash_input,
    normalize_morocco_phone,
    tiktok_phone_hash_input,
    to_local_morocco_phone,
)


PRODUCTS = {
    "american-sugar-balance-complex": {
        "name_ar": "المركّب الأمريكي لضبط السكر — الأصلي",
        "sheet_sku": "TOPLUX-BSC-940-60",
    },
    "miracle-men-oil": {
        "name_ar": "الزيت المعجزة للرجال",
        "sheet_sku": "MIRACLE-MEN-OIL-30ML",
    },
}

SHEET_SKU_TO_PRODUCT_SKU = {
    data["sheet_sku"]: sku
    for sku, data in PRODUCTS.items()
}
SHEET_SKU_TO_PRODUCT_SKU.update({sku: sku for sku in PRODUCTS})


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
    fraud = evaluate_order_risk(
        db,
        phone_e164=phone_e164,
        whatsapp_e164=payload.whatsapp_e164,
        client_ip=client_ip,
        browser_fingerprint=payload.browser_fingerprint,
        device_id=payload.device_id,
        user_agent=user_agent,
    )

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
        browser_fingerprint=payload.browser_fingerprint,
        device_id=payload.device_id,
        risk_score=fraud.risk_score,
        risk_level=fraud.risk_level,
        fraud_flags={"rules": fraud.flags},
        block_reason=fraud.block_reason,
        fraud_checked_at=datetime.now(timezone.utc),
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
            name_ar=_product_name_ar(payload.sku),
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


def import_sheet_lead(db: Session, raw_payload: dict) -> tuple[Order, bool]:
    payload = _normalize_sheet_payload(raw_payload)
    source_id = _first_value(payload, "SOURCE ID", "SOURCE_ID", "SHOPIFY ORDER ID", "SHOPIFY_ORDER_ID", "ORDER ID", "ORDER_ID", "ID")
    if source_id:
        existing = (
            db.query(Order)
            .filter(Order.utm["sheet_source_id"].astext == source_id.strip())
            .first()
        )
        if existing:
            return existing, False

    phone_raw = _required_value(payload, "PHONE NUMBER", "PHONE", "PHONE_RAW", "TEL", "MOBILE")
    phone_e164 = normalize_morocco_phone(phone_raw)
    phone_local = to_local_morocco_phone(phone_e164)
    customer_name = _required_value(payload, "FULL NAME", "FULL_NAME", "CUSTOMER", "CUSTOMER NAME", "NAME")
    sku_raw = _required_value(payload, "SKU", "PRODUCT SKU", "PRODUCT_SKU")
    product_name = _first_value(payload, "PRODUCT", "PRODUCT NAME", "PRODUCT_NAME", "ITEM", "TITLE")
    product_sku = _product_sku_from_sheet(sku_raw, product_name)
    qty = _positive_int(_first_value(payload, "QUANTITY", "QTY", "QTE"), default=1)
    total_mad = _positive_int(_first_value(payload, "TOTAL PRICE MAD", "TOTAL", "PRICE", "TOTAL PRICE", "AMOUNT"), default=_default_total_for_qty(qty))
    unit_price_mad = round(total_mad / qty) if qty else total_mad

    city = _first_value(payload, "CITY", "VILLE", "TOWN")
    address = _first_value(payload, "ADDRESS", "ADRESSE", "SHIPPING ADDRESS", "SHIPPING_ADDRESS")
    source = _first_value(payload, "SOURCE", "STORE", "SHOP", "SHOPIFY STORE") or "shopify_sheet"
    row_number = _first_value(payload, "ROW", "ROW NUMBER", "ROW_NUMBER")

    order = Order(
        public_order_number=_next_public_order_number(db),
        status="new",
        customer_name=customer_name.strip(),
        phone_raw=phone_raw.strip(),
        phone_local=phone_local,
        phone_e164=phone_e164,
        phone_hash_meta=sha256_hex(meta_phone_hash_input(phone_e164)),
        phone_hash_tiktok=sha256_hex(tiktok_phone_hash_input(phone_e164)),
        city=city.strip() if city else None,
        address=address.strip() if address else None,
        risk_score=0,
        risk_level="low",
        fraud_flags={"source": "shopify_sheet_import"},
        fraud_checked_at=datetime.now(timezone.utc),
        hero_sku=product_sku,
        hero_qty=qty,
        hero_price_mad=unit_price_mad,
        subtotal_mad=total_mad,
        total_mad=total_mad,
        currency="MAD",
        utm={
            "source": source.strip(),
            "imported_from": "google_sheet",
            "sheet_source_id": source_id.strip() if source_id else None,
            "sheet_row_number": row_number.strip() if row_number else None,
            "sheet_sku": sku_raw.strip(),
            "sheet_product_name": product_name.strip() if product_name else None,
        },
        sheet_sync_status="imported",
    )
    order.items.append(
        OrderItem(
            sku=product_sku,
            name_ar=_product_name_ar(product_sku),
            qty=qty,
            unit_price_mad=unit_price_mad,
            total_price_mad=total_mad,
            item_type="hero",
            added_via="shopify_sheet",
        )
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order, True


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
    product_skus = [_product_sheet_sku(getattr(item, "sku", order.hero_sku)) for item in order.items] or [_product_sheet_sku(order.hero_sku)]
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


def _product_name_ar(sku: str) -> str:
    return PRODUCTS.get(sku, PRODUCTS["american-sugar-balance-complex"])["name_ar"]


def _product_sheet_sku(sku: str) -> str:
    return PRODUCTS.get(sku, PRODUCTS["american-sugar-balance-complex"])["sheet_sku"]


def _normalize_sheet_payload(payload: dict) -> dict[str, str]:
    row = payload.get("row") or payload.get("lead") or payload.get("order") or payload
    if not isinstance(row, dict):
        raise ValueError("Sheet payload must be an object")
    return {str(key).strip().upper(): "" if value is None else str(value).strip() for key, value in row.items()}


def _first_value(payload: dict[str, str], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key.upper())
        if value:
            return value
    return None


def _required_value(payload: dict[str, str], *keys: str) -> str:
    value = _first_value(payload, *keys)
    if not value:
        raise ValueError(f"Missing required field: {keys[0]}")
    return value


def _positive_int(value: str | None, *, default: int) -> int:
    if not value:
        return default
    digits = "".join(ch for ch in value.split("/")[0] if ch.isdigit())
    number = int(digits) if digits else default
    return max(1, number)


def _default_total_for_qty(qty: int) -> int:
    return {1: 199, 2: 299, 3: 349}.get(qty, 199 * qty)


def _product_sku_from_sheet(sheet_sku: str, product_name: str | None = None) -> str:
    normalized_sku = sheet_sku.strip()
    if normalized_sku in SHEET_SKU_TO_PRODUCT_SKU:
        return SHEET_SKU_TO_PRODUCT_SKU[normalized_sku]

    normalized_upper = normalized_sku.upper()
    for known_sheet_sku, product_sku in SHEET_SKU_TO_PRODUCT_SKU.items():
        if normalized_upper == known_sheet_sku.upper():
            return product_sku

    haystack = f"{normalized_sku} {product_name or ''}".lower()
    if "miracle" in haystack or "men-oil" in haystack or "men oil" in haystack or "xxl" in haystack:
        return "miracle-men-oil"
    if "sugar" in haystack or "balance" in haystack or "bsc" in haystack or "سكر" in haystack:
        return "american-sugar-balance-complex"

    raise ValueError(f"Unknown product SKU: {sheet_sku}")
