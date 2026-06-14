from __future__ import annotations

import uuid
from datetime import date as date_cls
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TrackingPixel(Base):
    """A configured advertising pixel / tracking integration.

    Supports Meta, TikTok, Google Ads, YouTube and GA4. Access tokens are
    stored server-side and never returned in clear text (masked on read).
    """

    __tablename__ = "tracking_pixels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform: Mapped[str] = mapped_column(String(32), index=True)  # meta|tiktok|google_ads|youtube|ga4
    name: Mapped[str] = mapped_column(String(160))
    pixel_id: Mapped[str] = mapped_column(String(160))
    access_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    test_event_code: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    capi_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)  # active|disabled
    scope_type: Mapped[str] = mapped_column(String(24), default="store")  # store|product|landing|campaign
    scope_value: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    events_enabled: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    extra: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # e.g. ga4 api_secret, ads label
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TrackingLog(Base):
    """Diagnostics + delivery log for tracking events (tests, CAPI sends, errors)."""

    __tablename__ = "tracking_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pixel_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    event_name: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(16), default="server")  # browser|server|test
    status: Mapped[str] = mapped_column(String(16), default="ok", index=True)  # ok|error
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class TrackingSpend(Base):
    """Manual ad-spend entry per platform per day (powers ROAS / CPL / CPP)."""

    __tablename__ = "tracking_spend"
    __table_args__ = (UniqueConstraint("platform", "day", name="uq_tracking_spend_platform_day"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    day: Mapped[date_cls] = mapped_column(Date, index=True)
    amount_mad: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
