"""add product links manager tables

Revision ID: 20260615_0007
Revises: 20260614_0006
Create Date: 2026-06-15
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260615_0007"
down_revision: str | None = "20260614_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "product_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("full_url", sa.Text(), nullable=False),
        sa.Column("product_name", sa.String(length=160), nullable=False),
        sa.Column("platform", sa.String(length=32), nullable=False),
        sa.Column("campaign_name", sa.String(length=160), nullable=True),
        sa.Column("ad_account_name", sa.String(length=160), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_product_links_slug", "product_links", ["slug"], unique=True)
    op.create_index("ix_product_links_name", "product_links", ["name"])
    op.create_index("ix_product_links_product_name", "product_links", ["product_name"])
    op.create_index("ix_product_links_platform", "product_links", ["platform"])
    op.create_index("ix_product_links_campaign_name", "product_links", ["campaign_name"])
    op.create_index("ix_product_links_ad_account_name", "product_links", ["ad_account_name"])
    op.create_index("ix_product_links_status", "product_links", ["status"])

    op.create_table(
        "product_link_clicks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("link_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("visitor_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("referer", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["link_id"], ["product_links.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_product_link_clicks_link_id", "product_link_clicks", ["link_id"])
    op.create_index("ix_product_link_clicks_visitor_hash", "product_link_clicks", ["visitor_hash"])
    op.create_index("ix_product_link_clicks_created_at", "product_link_clicks", ["created_at"])


def downgrade() -> None:
    op.drop_table("product_link_clicks")
    op.drop_table("product_links")
