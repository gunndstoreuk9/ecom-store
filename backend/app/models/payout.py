from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ConfirmationPayoutState(Base):
    """Single-row table holding the live confirmation-team payout settings.

    The payout balance accumulates continuously (no date windows). Counting
    starts from `last_reset_at`; when an admin marks it paid, we move that
    timestamp forward so future orders start a fresh balance.
    """

    __tablename__ = "confirmation_payout_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    commission_per_order: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    manual_adjustment_mad: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ConfirmationPayout(Base):
    """Audit log of each "Mark as Paid & Reset" action."""

    __tablename__ = "confirmation_payouts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    commission_per_order: Mapped[int] = mapped_column(Integer, default=5)
    base_amount_mad: Mapped[int] = mapped_column(Integer, default=0)
    manual_adjustment_mad: Mapped[int] = mapped_column(Integer, default=0)
    total_amount_mad: Mapped[int] = mapped_column(Integer, default=0)
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
