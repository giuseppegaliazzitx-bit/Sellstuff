"""product tables: inventory, desk, chat, offers

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_TABLES = [
    "events",
    "mailbox_state",
    "imported_buyers",
    "user_notes",
    "outbox",
    "notifications",
    "messages",
    "thread_participants",
    "threads",
    "showing_rsvps",
    "showing_windows",
    "offers",
    "deal_acknowledgments",
    "contact_events",
    "interests",
    "saved_deals",
    "audit_log",
    "notices",
    "deal_price_history",
    "deal_status_history",
    "deal_documents",
    "deal_photos",
    "deals",
    "markets",
]


def upgrade() -> None:
    bind = op.get_bind()
    from app.db.base import Base
    from app.models import Deal, Market, User  # noqa: F401

    Base.metadata.create_all(bind)
    with op.batch_alter_table("buyer_profiles") as batch:
        batch.add_column(sa.Column("tier", sa.String(length=8), server_default="C"))
        batch.add_column(sa.Column("tags", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("do_not_contact", sa.Boolean(), server_default="0"))
        batch.add_column(sa.Column("closed_count", sa.Integer(), server_default="0"))
        batch.add_column(sa.Column("flake_count", sa.Integer(), server_default="0"))
        batch.add_column(sa.Column("funds_verified", sa.Boolean(), server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("buyer_profiles") as batch:
        for col in (
            "tier",
            "tags",
            "do_not_contact",
            "closed_count",
            "flake_count",
            "funds_verified",
        ):
            batch.drop_column(col)
    for table in NEW_TABLES:
        op.drop_table(table)
