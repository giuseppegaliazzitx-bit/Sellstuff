"""Engine / session factory. SQLite locally, Postgres in Compose/prod."""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings


def to_sync_url(async_url: str) -> str:
    if async_url.startswith("sqlite+aiosqlite://"):
        return "sqlite://" + async_url.removeprefix("sqlite+aiosqlite://")
    return async_url


def _ensure_sqlite_dir(url: str) -> None:
    if not url.startswith("sqlite"):
        return
    # sqlite+aiosqlite:///./data/foo.db  or  sqlite:///./data/foo.db
    raw = url.split(":///", 1)[-1]
    if raw.startswith("./") or raw.startswith("../") or (len(raw) > 1 and raw[1] != ":"):
        path = Path(raw)
        if path.parent.as_posix() not in {"", "."}:
            path.parent.mkdir(parents=True, exist_ok=True)


def create_engine(settings: Settings) -> AsyncEngine:
    _ensure_sqlite_dir(settings.database_url)
    connect_args: dict[str, object] = {}
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_async_engine(
        settings.database_url,
        echo=False,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def ping_database(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        await conn.exec_driver_sql("SELECT 1")


async def session_scope(
    factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with factory() as session:
        yield session
