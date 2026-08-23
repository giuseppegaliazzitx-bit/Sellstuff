"""blasts, geocode cache

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-23
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.desk import BlastCampaign, BlastRecipient, GeocodeCache

    BlastCampaign.__table__.create(bind, checkfirst=True)
    BlastRecipient.__table__.create(bind, checkfirst=True)
    GeocodeCache.__table__.create(bind, checkfirst=True)


def downgrade() -> None:
    op.drop_table("blast_recipients")
    op.drop_table("blast_campaigns")
    op.drop_table("geocode_cache")
