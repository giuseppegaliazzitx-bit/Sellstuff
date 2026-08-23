"""Run Alembic to head. Used on local/dev boot and in tests."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import Settings
from app.db.session import to_sync_url

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def upgrade_head(settings: Settings) -> None:
    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", to_sync_url(settings.database_url))
    command.upgrade(cfg, "head")
