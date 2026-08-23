from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.core.kv import KV
from app.models import RefreshToken, User
from app.services.auth import bump_ver


def _now() -> datetime:
    return datetime.now(UTC)


async def list_buyers(session: AsyncSession, status: str | None = None) -> list[User]:
    stmt = (
        select(User)
        .options(selectinload(User.profile), selectinload(User.terms))
        .where(User.role == "client", User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
    )
    if status:
        stmt = stmt.where(User.status == status)
    return list((await session.execute(stmt)).scalars().all())


async def get_client(session: AsyncSession, user_id: str) -> User:
    user = (
        await session.execute(
            select(User)
            .options(selectinload(User.profile), selectinload(User.terms))
            .where(User.id == user_id, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None:
        raise AppError(404, "not_found", "User not found")
    return user


async def _revoke_all(session: AsyncSession, user_id: str) -> None:
    now = _now()
    rows = (
        (await session.execute(select(RefreshToken).where(RefreshToken.user_id == user_id)))
        .scalars()
        .all()
    )
    for row in rows:
        if row.revoked_at is None:
            row.revoked_at = now


async def approve_user(
    session: AsyncSession,
    kv: KV,
    *,
    admin: User,
    user: User,
    require_verified: bool,
) -> User:
    if user.role != "client":
        raise AppError(400, "not_a_client", "Only clients can be approved")
    if require_verified and user.email_verified_at is None:
        raise AppError(409, "email_unverified", "Buyer must verify email first")
    user.status = "active"
    user.approved_at = _now()
    user.approved_by_id = admin.id
    await bump_ver(session, kv, user)
    await session.commit()
    return user


async def reject_user(session: AsyncSession, kv: KV, *, user: User) -> User:
    user.status = "rejected"
    await bump_ver(session, kv, user)
    await _revoke_all(session, user.id)
    await session.commit()
    return user


async def suspend_user(session: AsyncSession, kv: KV, *, user: User) -> User:
    user.status = "suspended"
    await bump_ver(session, kv, user)
    await _revoke_all(session, user.id)
    await session.commit()
    return user
