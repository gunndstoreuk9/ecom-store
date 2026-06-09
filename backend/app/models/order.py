from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    public_order_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    phone_raw: Mapped[str] = mapped_column(String(64))
    phone_local: Mapped[str] = mapped_column(String(16), index=True)
    phone_e164: Mapped[str] = mapped_column(String(16), index=True)
    phone_hash_meta: Mapped[str] = mapped_column(String(64))
    phone_hash_tiktok: Mapped[str] = mapped_column(String(64))
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    call_status: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    call_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    call_attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    delivery_company: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    delivery_city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    hero_sku: Mapped[str] = mapped_column(String(120))
    hero_qty: Mapped[int] = mapped_column(Integer)
    hero_price_mad: Mapped[int] = mapped_column(Integer)
    subtotal_mad: Mapped[int] = mapped_column(Integer)
    total_mad: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="MAD")
    utm: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    event_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    client_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sheet_sync_status: Mapped[str] = mapped_column(String(32), default="pending")
    sheet_last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sheet_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    conversion_events: Mapped[list["ConversionEvent"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    sku: Mapped[str] = mapped_column(String(120))
    name_ar: Mapped[str] = mapped_column(String(240))
    qty: Mapped[int] = mapped_column(Integer)
    unit_price_mad: Mapped[int] = mapped_column(Integer)
    total_price_mad: Mapped[int] = mapped_column(Integer)
    item_type: Mapped[str] = mapped_column(String(40), default="hero")
    added_via: Mapped[str] = mapped_column(String(40), default="direct_cod_form")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="items")


class ConversionEvent(Base):
    __tablename__ = "conversion_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    platform: Mapped[str] = mapped_column(String(40))
    event_name: Mapped[str] = mapped_column(String(80))
    event_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    payload_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    response_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped[Order] = relationship(back_populates="conversion_events")
