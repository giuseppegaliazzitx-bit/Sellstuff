from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import encode_jwt
from app.integrations.mail import build_mail_provider
from app.models import BlastCampaign, BlastRecipient, Outbox, User, new_id
from app.services.match import estimate_finish


def _now() -> datetime:
    return datetime.now(UTC)


async def eligible_buyers(session: AsyncSession, segment: dict) -> list[User]:
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
    out = []
    for u in users:
        p = u.profile
        if p is None:
            continue
        if p.do_not_contact or not p.email_alerts_enabled:
            continue
        if segment.get("tier") and p.tier != segment["tier"]:
            continue
        if segment.get("tag") and segment["tag"] not in (p.tags or []):
            continue
        if segment.get("max_price") and p.max_price_cents and p.max_price_cents < int(segment["max_price"]):
            continue
        market = str(segment.get("market") or "").strip().lower()
        if market:
            names = [str(m).lower() for m in (p.markets or [])]
            if market not in names:
                continue
        out.append(u)
    return out


async def create_campaign(
    session: AsyncSession,
    settings: Settings,
    *,
    admin_id: str,
    subject: str,
    body: str,
    deal_id: str | None,
    segment: dict,
) -> BlastCampaign:
    if not settings.public_mailing_address and settings.mail_configured:
        raise AppError(409, "mailing_address_required", "Set PUBLIC_MAILING_ADDRESS")
    buyers = await eligible_buyers(session, segment)
    finish = estimate_finish(
        len(buyers),
        daily_limit=settings.mail_daily_limit,
        per_minute=settings.mail_rate_per_minute,
    )
    camp = BlastCampaign(
        id=new_id(),
        deal_id=deal_id,
        created_by=admin_id,
        subject=subject,
        body_template=body,
        segment=segment,
        status="draft",
        total=len(buyers),
        estimated_finish_at=finish,
        created_at=_now(),
    )
    session.add(camp)
    await session.flush()
    for u in buyers:
        session.add(BlastRecipient(id=new_id(), campaign_id=camp.id, user_id=u.id))
    await session.commit()
    await session.refresh(camp)
    return camp


async def send_campaign(session: AsyncSession, settings: Settings, camp: BlastCampaign) -> BlastCampaign:
    if not settings.public_mailing_address:
        raise AppError(409, "mailing_address_required", "Set PUBLIC_MAILING_ADDRESS before blasts")
    camp.status = "sending"
    provider = build_mail_provider(settings)
    recips = (
        (
            await session.execute(
                select(BlastRecipient).where(BlastRecipient.campaign_id == camp.id, BlastRecipient.sent_at.is_(None))
            )
        )
        .scalars()
        .all()
    )
    for row in recips:
        if camp.status == "paused":
            break
        user = (await session.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
        if user is None:
            continue
        token = encode_jwt(
            settings,
            sub=user.id,
            typ="track",
            ttl=timedelta(days=30),
            extra={"deal": camp.deal_id or "", "campaign": camp.id},
        )
        unsub = encode_jwt(
            settings,
            sub=user.id,
            typ="unsub",
            ttl=timedelta(days=90),
            extra={"email": user.email},
        )
        body = camp.body_template + f"\n\nTrack: /t/{token}\nUnsub: /u/{unsub}\n"
        if settings.public_mailing_address:
            body += f"\n{settings.public_mailing_address}\n"
        try:
            provider.send(to_addr=user.email, subject=camp.subject, body=body)
            row.sent_at = _now()
            camp.sent += 1
            session.add(
                Outbox(
                    id=new_id(),
                    kind="blast.recipient",
                    payload={"campaign": camp.id, "user_id": user.id},
                    sent_at=_now(),
                    created_at=_now(),
                )
            )
        except Exception as exc:  # noqa: BLE001
            row.error = str(exc)[:500]
    if camp.sent >= camp.total:
        camp.status = "done"
    elif camp.status != "paused":
        camp.status = "sending"
    await session.commit()
    return camp
