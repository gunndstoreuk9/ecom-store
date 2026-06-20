"""add agent payout_last_reset_at

Revision ID: 0010_add_agent_payout_reset
Revises: 20260619_0009_add_agents
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_add_agent_payout_reset"
down_revision = "20260619_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agents",
        sa.Column("payout_last_reset_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agents", "payout_last_reset_at")
