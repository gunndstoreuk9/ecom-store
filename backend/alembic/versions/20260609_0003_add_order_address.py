"""add order address

Revision ID: 20260609_0003
Revises: 20260609_0002
Create Date: 2026-06-09
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260609_0003"
down_revision: str | None = "20260609_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("address", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "address")
