"""create orders tables

Revision ID: 20260607_0001
Revises:
Create Date: 2026-06-07
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260607_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("public_order_number", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("customer_name", sa.String(length=160), nullable=False),
        sa.Column("phone_raw", sa.String(length=64), nullable=False),
        sa.Column("phone_local", sa.String(length=16), nullable=False),
        sa.Column("phone_e164", sa.String(length=16), nullable=False),
        sa.Column("phone_hash_meta", sa.String(length=64), nullable=False),
        sa.Column("phone_hash_tiktok", sa.String(length=64), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("hero_sku", sa.String(length=120), nullable=False),
        sa.Column("hero_qty", sa.Integer(), nullable=False),
        sa.Column("hero_price_mad", sa.Integer(), nullable=False),
        sa.Column("subtotal_mad", sa.Integer(), nullable=False),
        sa.Column("total_mad", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("utm", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("event_id", sa.String(length=120), nullable=True),
        sa.Column("client_ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("sheet_sync_status", sa.String(length=32), nullable=False),
        sa.Column("sheet_last_error", sa.Text(), nullable=True),
        sa.Column("sheet_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_orders_phone_e164"), "orders", ["phone_e164"], unique=False)
    op.create_index(op.f("ix_orders_phone_local"), "orders", ["phone_local"], unique=False)
    op.create_index(op.f("ix_orders_public_order_number"), "orders", ["public_order_number"], unique=True)
    op.create_index(op.f("ix_orders_status"), "orders", ["status"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(length=120), nullable=False),
        sa.Column("name_ar", sa.String(length=240), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("unit_price_mad", sa.Integer(), nullable=False),
        sa.Column("total_price_mad", sa.Integer(), nullable=False),
        sa.Column("item_type", sa.String(length=40), nullable=False),
        sa.Column("added_via", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "conversion_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("platform", sa.String(length=40), nullable=False),
        sa.Column("event_name", sa.String(length=80), nullable=False),
        sa.Column("event_id", sa.String(length=120), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("response_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("conversion_events")
    op.drop_table("order_items")
    op.drop_index(op.f("ix_orders_status"), table_name="orders")
    op.drop_index(op.f("ix_orders_public_order_number"), table_name="orders")
    op.drop_index(op.f("ix_orders_phone_local"), table_name="orders")
    op.drop_index(op.f("ix_orders_phone_e164"), table_name="orders")
    op.drop_table("orders")
