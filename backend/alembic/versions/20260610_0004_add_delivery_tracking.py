"""add delivery tracking fields

Revision ID: 20260610_0004
Revises: 20260609_0003
Create Date: 2026-06-10
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0004"
down_revision: str | None = "20260609_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("delivery_tracking", sa.String(length=120), nullable=True))
    op.add_column("orders", sa.Column("delivery_error", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "delivery_error")
    op.drop_column("orders", "delivery_tracking")
