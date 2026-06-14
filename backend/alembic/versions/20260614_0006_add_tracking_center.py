"""add tracking center tables (pixels, logs, spend)

Revision ID: 20260614_0006
Revises: 20260613_0005
Create Date: 2026-06-14
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260614_0006"
down_revision: str | None = "20260613_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tracking_pixels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("pixel_id", sa.String(length=160), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("test_event_code", sa.String(length=120), nullable=True),
        sa.Column("capi_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("scope_type", sa.String(length=24), nullable=False, server_default="store"),
        sa.Column("scope_value", sa.String(length=200), nullable=True),
        sa.Column("events_enabled", postgresql.JSONB(), nullable=True),
        sa.Column("extra", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tracking_pixels_platform", "tracking_pixels", ["platform"])
    op.create_index("ix_tracking_pixels_status", "tracking_pixels", ["status"])

    op.create_table(
        "tracking_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pixel_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False, server_default="server"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="ok"),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tracking_logs_pixel_id", "tracking_logs", ["pixel_id"])
    op.create_index("ix_tracking_logs_platform", "tracking_logs", ["platform"])
    op.create_index("ix_tracking_logs_status", "tracking_logs", ["status"])
    op.create_index("ix_tracking_logs_created_at", "tracking_logs", ["created_at"])

    op.create_table(
        "tracking_spend",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("amount_mad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("platform", "day", name="uq_tracking_spend_platform_day"),
    )
    op.create_index("ix_tracking_spend_platform", "tracking_spend", ["platform"])
    op.create_index("ix_tracking_spend_day", "tracking_spend", ["day"])


def downgrade() -> None:
    op.drop_table("tracking_spend")
    op.drop_table("tracking_logs")
    op.drop_table("tracking_pixels")
