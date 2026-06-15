from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.services.phone import is_valid_morocco_mobile, normalize_morocco_phone


class CreateOrderRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    phone_raw: str = Field(min_length=8, max_length=64)
    phone_e164: Optional[str] = Field(default=None, max_length=16)
    city: Optional[str] = Field(default=None, max_length=120)
    offer_id: str
    qty: int
    price_mad: int
    sku: str
    utm: Optional[dict[str, str]] = None
    event_id: Optional[str] = None
    whatsapp_e164: Optional[str] = Field(default=None, max_length=16)
    browser_fingerprint: Optional[str] = Field(default=None, max_length=128)
    device_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("browser_fingerprint", "device_id")
    @classmethod
    def normalize_client_identifier(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned or None

    @field_validator("phone_raw")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not is_valid_morocco_mobile(value):
            raise ValueError("Invalid Morocco mobile number")
        return value

    @field_validator("phone_e164")
    @classmethod
    def validate_phone_e164(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not is_valid_morocco_mobile(value):
            raise ValueError("Invalid Morocco mobile number")
        return normalize_morocco_phone(value)

    @field_validator("whatsapp_e164")
    @classmethod
    def validate_whatsapp_e164(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not is_valid_morocco_mobile(value):
            raise ValueError("Invalid Morocco WhatsApp number")
        return normalize_morocco_phone(value)


class OrderResponse(BaseModel):
    order_id: str
    public_order_number: str
    status: str
    name: str
    phone: str
    city: Optional[str] = None
    offer_id: str
    qty: int
    price_mad: int
    total_mad: int
    created_at: Optional[datetime] = None


class OrderDetailResponse(OrderResponse):
    id: UUID
    sku: str
    sheet_sync_status: str
