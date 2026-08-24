"""market managers assigned to markets

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_column(bind, table: str, name: str) -> bool:
    insp = sa.inspect(bind)
    return name in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.inventory import MarketManager

    MarketManager.__table__.create(bind, checkfirst=True)
    if not _has_column(bind, "markets", "manager_id"):
        with op.batch_alter_table("markets") as batch:
            batch.add_column(sa.Column("manager_id", sa.String(length=36), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("markets") as batch:
        batch.drop_column("manager_id")
    op.drop_table("market_managers")
