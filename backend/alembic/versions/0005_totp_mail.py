"""totp secrets, recovery codes, email links

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_column(bind, table: str, name: str) -> bool:
    insp = sa.inspect(bind)
    return name in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.desk import EmailLink, TotpRecoveryCode

    TotpRecoveryCode.__table__.create(bind, checkfirst=True)
    EmailLink.__table__.create(bind, checkfirst=True)
    if not _has_column(bind, "users", "totp_secret"):
        with op.batch_alter_table("users") as batch:
            batch.add_column(sa.Column("totp_secret", sa.Text(), nullable=True))
            batch.add_column(sa.Column("totp_enrolled_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_table("email_links")
    op.drop_table("totp_recovery_codes")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("totp_enrolled_at")
        batch.drop_column("totp_secret")
