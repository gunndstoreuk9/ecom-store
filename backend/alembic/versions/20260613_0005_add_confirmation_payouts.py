"""add confirmation payout state, log table and order dispatched_at

Revision ID: 20260613_0005
Revises: 20260610_0004
Create Date: 2026-06-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260613_0005"
down_revision: str | None = "20260610_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_orders_dispatched_at", "orders", ["dispatched_at"])

    op.create_table(
        "confirmation_payout_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("commission_per_order", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("manual_adjustment_mad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_reset_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "confirmation_payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("orders_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("commission_per_order", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("base_amount_mad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("manual_adjustment_mad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_amount_mad", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("confirmation_payouts")
    op.drop_table("confirmation_payout_state")
    op.drop_index("ix_orders_dispatched_at", table_name="orders")
    op.drop_column("orders", "dispatched_at")
