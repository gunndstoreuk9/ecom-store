from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FraudSettings(Base):
    __tablename__ = "fraud_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    enabled: Mapped[bool] = mapped_column(default=True, server_default="true")
    lock_period_minutes: Mapped[int] = mapped_column(Integer, default=120, server_default="120")
    medium_risk_threshold: Mapped[int] = mapped_column(Integer, default=40, server_default="40")
    high_risk_threshold: Mapped[int] = mapped_column(Integer, default=70, server_default="70")
    ip_window_minutes: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    ip_order_limit: Mapped[int] = mapped_column(Integer, default=3, server_default="3")
    device_phone_limit: Mapped[int] = mapped_column(Integer, default=2, server_default="2")
    rapid_submit_seconds: Mapped[int] = mapped_column(Integer, default=60, server_default="60")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FraudEvent(Base):
    __tablename__ = "fraud_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(32), index=True)
    phone_e164: Mapped[Optional[str]] = mapped_column(String(16), nullable=True, index=True)
    client_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    browser_fingerprint: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0", index=True)
    risk_level: Mapped[str] = mapped_column(String(16), default="low", server_default="low", index=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
