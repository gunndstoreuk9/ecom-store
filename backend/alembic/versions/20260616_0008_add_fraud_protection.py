"""add fraud protection

Revision ID: 20260616_0008
Revises: 20260615_0007
Create Date: 2026-06-16
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260616_0008"
down_revision: str | None = "20260615_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("browser_fingerprint", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("device_id", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("risk_level", sa.String(length=16), nullable=False, server_default="low"))
    op.add_column("orders", sa.Column("fraud_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("orders", sa.Column("block_reason", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("fraud_checked_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_orders_browser_fingerprint"), "orders", ["browser_fingerprint"])
    op.create_index(op.f("ix_orders_device_id"), "orders", ["device_id"])
    op.create_index(op.f("ix_orders_risk_score"), "orders", ["risk_score"])
    op.create_index(op.f("ix_orders_risk_level"), "orders", ["risk_level"])
    op.create_index(op.f("ix_orders_fraud_checked_at"), "orders", ["fraud_checked_at"])
    op.create_index("ix_orders_client_ip_created_at", "orders", ["client_ip", "created_at"])
    op.create_index("ix_orders_phone_created_at", "orders", ["phone_e164", "created_at"])
    op.create_index("ix_orders_device_created_at", "orders", ["device_id", "created_at"])
    op.create_index("ix_orders_fingerprint_created_at", "orders", ["browser_fingerprint", "created_at"])

    op.create_table(
        "fraud_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("lock_period_minutes", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("medium_risk_threshold", sa.Integer(), nullable=False, server_default="40"),
        sa.Column("high_risk_threshold", sa.Integer(), nullable=False, server_default="70"),
        sa.Column("ip_window_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("ip_order_limit", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("device_phone_limit", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("rapid_submit_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute(
        "INSERT INTO fraud_settings (id, enabled, lock_period_minutes, medium_risk_threshold, high_risk_threshold, ip_window_minutes, ip_order_limit, device_phone_limit, rapid_submit_seconds) "
        "VALUES (1, true, 120, 40, 70, 30, 3, 2, 60)"
    )

    op.create_table(
        "fraud_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("phone_e164", sa.String(length=16), nullable=True),
        sa.Column("client_ip", sa.String(length=64), nullable=True),
        sa.Column("browser_fingerprint", sa.String(length=128), nullable=True),
        sa.Column("device_id", sa.String(length=128), nullable=True),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("flags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_fraud_events_event_type"), "fraud_events", ["event_type"])
    op.create_index(op.f("ix_fraud_events_phone_e164"), "fraud_events", ["phone_e164"])
    op.create_index(op.f("ix_fraud_events_client_ip"), "fraud_events", ["client_ip"])
    op.create_index(op.f("ix_fraud_events_browser_fingerprint"), "fraud_events", ["browser_fingerprint"])
    op.create_index(op.f("ix_fraud_events_device_id"), "fraud_events", ["device_id"])
    op.create_index(op.f("ix_fraud_events_risk_score"), "fraud_events", ["risk_score"])
    op.create_index(op.f("ix_fraud_events_risk_level"), "fraud_events", ["risk_level"])
    op.create_index(op.f("ix_fraud_events_created_at"), "fraud_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("fraud_events")
    op.drop_table("fraud_settings")
    op.drop_index("ix_orders_fingerprint_created_at", table_name="orders")
    op.drop_index("ix_orders_device_created_at", table_name="orders")
    op.drop_index("ix_orders_phone_created_at", table_name="orders")
    op.drop_index("ix_orders_client_ip_created_at", table_name="orders")
    op.drop_index(op.f("ix_orders_fraud_checked_at"), table_name="orders")
    op.drop_index(op.f("ix_orders_risk_level"), table_name="orders")
    op.drop_index(op.f("ix_orders_risk_score"), table_name="orders")
    op.drop_index(op.f("ix_orders_device_id"), table_name="orders")
    op.drop_index(op.f("ix_orders_browser_fingerprint"), table_name="orders")
    op.drop_column("orders", "fraud_checked_at")
    op.drop_column("orders", "block_reason")
    op.drop_column("orders", "fraud_flags")
    op.drop_column("orders", "risk_level")
    op.drop_column("orders", "risk_score")
    op.drop_column("orders", "device_id")
    op.drop_column("orders", "browser_fingerprint")
