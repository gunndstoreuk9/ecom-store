"""add call center and delivery fields

Revision ID: 20260609_0002
Revises: 20260607_0001
Create Date: 2026-06-09
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0002"
down_revision: str | None = "20260607_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("call_status", sa.String(length=40), nullable=True))
    op.add_column("orders", sa.Column("call_note", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("call_attempts", sa.Integer(), server_default="0", nullable=False))
    op.add_column("orders", sa.Column("delivery_company", sa.String(length=64), nullable=True))
    op.add_column("orders", sa.Column("delivery_city", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "delivery_city")
    op.drop_column("orders", "delivery_company")
    op.drop_column("orders", "call_attempts")
    op.drop_column("orders", "call_note")
    op.drop_column("orders", "call_status")
