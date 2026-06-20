from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    display_name: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(16), default="active", server_default="active", index=True)
    allowed_skus: Mapped[Optional[list]] = mapped_column(ARRAY(String(120)), nullable=True)
    payout_last_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, deferred=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assigned_orders: Mapped[list["Order"]] = relationship(  # type: ignore[name-defined]
        "Order",
        back_populates="assigned_agent",
        foreign_keys="Order.assigned_agent_id",
    )
