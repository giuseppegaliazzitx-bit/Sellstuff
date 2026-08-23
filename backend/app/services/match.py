from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Deal, Market, Notification, Outbox, User, new_id


def buy_box_matches(deal: Deal, user: User) -> bool:
    profile = user.profile
    if profile is None:
        return False
    if profile.do_not_contact:
        return False
    if not profile.email_alerts_enabled:
        return False
    if user.status != "active":
        return False
    if profile.max_price_cents and deal.list_price_cents > profile.max_price_cents:
        return False
    market_name = deal.market.name if deal.market else ""
    market_slug = deal.market.slug if deal.market else ""
    wanted = [str(m).lower() for m in (profile.markets or [])]
    if wanted and market_name.lower() not in wanted and market_slug.lower() not in wanted:
        return False
    types = [str(t).lower() for t in (profile.asset_types or [])]
    if types and deal.property_type.lower() not in types:
        return False
    return True


def estimate_finish(n: int, *, daily_limit: int, per_minute: int, now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    if n <= 0:
        return now
    days = (n + daily_limit - 1) // max(daily_limit, 1)
    minutes = (n + per_minute - 1) // max(per_minute, 1)
    from datetime import timedelta

    by_cap = now + timedelta(days=max(days - 1, 0), minutes=min(minutes, 24 * 60))
    return by_cap


async def notify_matches(session: AsyncSession, deal: Deal) -> int:
    users = (
        (
            await session.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.role == "client", User.deleted_at.is_(None), User.status == "active")
            )
        )
        .scalars()
        .all()
    )
    if deal.market is None:
        market = (await session.execute(select(Market).where(Market.id == deal.market_id))).scalar_one_or_none()
        deal.market = market
    count = 0
    now = datetime.now(UTC)
    until = deal.early_access_until
    if until is not None and until.tzinfo is None:
        until = until.replace(tzinfo=UTC)
    early = bool(until and until > now)
    for user in users:
        if not buy_box_matches(deal, user):
            continue
        if early:
            tier = user.profile.tier if user.profile else "C"
            if tier != "A":
                continue
        session.add(
            Notification(
                id=new_id(),
                user_id=user.id,
                type="deal.alert",
                payload={"deal_id": deal.id, "address": deal.address1},
                created_at=now,
            )
        )
        session.add(
            Outbox(
                id=new_id(),
                kind="alert.deal",
                payload={"user_id": user.id, "deal_id": deal.id},
                created_at=now,
            )
        )
        count += 1
    await session.commit()
    return count
