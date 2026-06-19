"""add agents and order assignment

Revision ID: 20260619_0009
Revises: 20260616_0008
Create Date: 2026-06-19
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260619_0009"
down_revision: str | None = "20260616_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(64), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("allowed_skus", postgresql.ARRAY(sa.String(120)), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agents_status", "agents", ["status"])

    op.add_column("orders", sa.Column("assigned_agent_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("orders", sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key(
        "fk_orders_assigned_agent",
        "orders",
        "agents",
        ["assigned_agent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_orders_assigned_agent_id", "orders", ["assigned_agent_id"])


def downgrade() -> None:
    op.drop_index("ix_orders_assigned_agent_id", table_name="orders")
    op.drop_constraint("fk_orders_assigned_agent", "orders", type_="foreignkey")
    op.drop_column("orders", "first_response_at")
    op.drop_column("orders", "assigned_at")
    op.drop_column("orders", "assigned_agent_id")
    op.drop_index("ix_agents_status", table_name="agents")
    op.drop_table("agents")
