from __future__ import annotations

from datetime import UTC, datetime, timedelta
from statistics import median

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    BlastCampaign,
    BlastRecipient,
    ContactEvent,
    Deal,
    Event,
    Interest,
    Message,
    Offer,
    User,
)
from app.services.status import CLIENT_VISIBLE


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


async def overview(session: AsyncSession) -> dict:
    now = datetime.now(UTC)
    week = now - timedelta(days=7)
    deals = list((await session.execute(select(Deal).where(Deal.deleted_at.is_(None)))).scalars().all())
    by_status: dict[str, int] = {}
    clock = []
    doms: list[int] = []
    for d in deals:
        by_status[d.status] = by_status.get(d.status, 0) + 1
        close = _aware(d.contract_close_by)
        if close:
            days = int((close - now).total_seconds() // 86400)
            clock.append({"id": d.id, "address1": d.address1, "days_left": days, "urgent": days < 7})
        pub = _aware(d.published_at)
        if pub and d.status in CLIENT_VISIBLE | {"under_contract", "assigned", "pending"}:
            doms.append(max(0, int((now - pub).total_seconds() // 86400)))
    clock.sort(key=lambda r: r["days_left"])

    views_7d = int(
        (
            await session.execute(
                select(func.count()).where(Event.name == "deal.viewed", Event.at >= week)
            )
        ).scalar_one()
        or 0
    )
    chats_7d = int((await session.execute(select(func.count()).where(Message.created_at >= week))).scalar_one() or 0)
    offers_7d = int((await session.execute(select(func.count()).where(Offer.created_at >= week))).scalar_one() or 0)
    views_all = int((await session.execute(select(func.count()).where(Event.name == "deal.viewed"))).scalar_one() or 0)
    interests = int((await session.execute(select(func.count()).select_from(Interest))).scalar_one() or 0)
    offers_n = int((await session.execute(select(func.count()).select_from(Offer))).scalar_one() or 0)
    accepted = int(
        (await session.execute(select(func.count()).where(Offer.status == "accepted"))).scalar_one() or 0
    )

    camps = list(
        (await session.execute(select(BlastCampaign).order_by(BlastCampaign.created_at.desc()))).scalars().all()
    )
    blast_rows = []
    for c in camps[:20]:
        bounced = int(
            (
                await session.execute(
                    select(func.count()).where(BlastRecipient.campaign_id == c.id, BlastRecipient.bounced.is_(True))
                )
            ).scalar_one()
            or 0
        )
        blast_rows.append(
            {
                "id": c.id,
                "subject": c.subject,
                "sent": c.sent,
                "clicked": c.clicked,
                "bounced": bounced,
                "total": c.total,
            }
        )

    contact_rows = (
        await session.execute(
            select(ContactEvent.deal_id, func.count().label("n"))
            .group_by(ContactEvent.deal_id)
            .order_by(func.count().desc())
        )
    ).all()
    deal_names = {d.id: d.address1 for d in deals}
    leaderboard = [
        {"deal_id": did, "address1": deal_names.get(did, ""), "clicks": int(n)} for did, n in contact_rows[:10]
    ]

    buyers = list(
        (
            await session.execute(
                select(User)
                .options(selectinload(User.profile))
                .where(User.role == "client", User.deleted_at.is_(None))
            )
        )
        .scalars()
        .all()
    )
    empty = {"buyers": 0, "closed": 0}
    tier_stats: dict[str, dict[str, int]] = {"A": dict(empty), "B": dict(empty), "C": dict(empty)}
    sources: dict[str, dict[str, int]] = {}
    for u in buyers:
        p = u.profile
        tier = (p.tier if p else "C") or "C"
        if tier not in tier_stats:
            tier_stats[tier] = {"buyers": 0, "closed": 0}
        tier_stats[tier]["buyers"] += 1
        closed = int(p.closed_count) if p else 0
        tier_stats[tier]["closed"] += closed
        src = (p.lead_source if p else "website") or "website"
        bucket = sources.setdefault(src, {"buyers": 0, "closed": 0})
        bucket["buyers"] += 1
        bucket["closed"] += closed

    return {
        "counts": by_status,
        "contract_board": clock,
        "deals": len(deals),
        "median_dom_days": int(median(doms)) if doms else None,
        "last_7d": {"views": views_7d, "chats": chats_7d, "offers": offers_7d},
        "funnel": {"views": views_all, "interests": interests, "offers": offers_n, "accepted": accepted},
        "blasts": blast_rows,
        "contact_leaderboard": leaderboard,
        "tier_conversion": tier_stats,
        "lead_sources": sources,
    }


async def notify_contract_clock(session: AsyncSession) -> int:
    now = datetime.now(UTC)
    admins = list(
        (await session.execute(select(User).where(User.role == "admin", User.deleted_at.is_(None)))).scalars().all()
    )
    deals = list((await session.execute(select(Deal).where(Deal.deleted_at.is_(None)))).scalars().all())
    urgent = []
    for d in deals:
        close = _aware(d.contract_close_by)
        if close is None:
            continue
        days = int((close - now).total_seconds() // 86400)
        if 0 <= days < 7:
            urgent.append({"id": d.id, "address1": d.address1, "days_left": days})
    if not urgent:
        return 0
    from app.models import Notification, new_id

    for admin in admins:
        session.add(
            Notification(
                id=new_id(),
                user_id=admin.id,
                type="contract.expiring",
                payload={"deals": urgent},
                created_at=now,
            )
        )
    await session.commit()
    return len(urgent)
