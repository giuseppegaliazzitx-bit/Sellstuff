from __future__ import annotations

import contextlib
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    BlastRecipient,
    BuyerProfile,
    EmailLink,
    MailboxState,
    Message,
    Thread,
    ThreadParticipant,
    User,
    UserNote,
    new_id,
)
from app.services.imap_match import match_from_address, match_thread_token

BOUNCE_MARKERS = ("mailer-daemon@", "postmaster@", "mail delivery subsystem")


def _now() -> datetime:
    return datetime.now(UTC)


def is_bounce(from_addr: str, subject: str) -> bool:
    blob = f"{from_addr} {subject}".lower()
    return any(m in blob for m in BOUNCE_MARKERS)


async def _known_emails(session: AsyncSession) -> dict[str, str]:
    rows = (await session.execute(select(User.id, User.email).where(User.deleted_at.is_(None)))).all()
    return {email.lower(): uid for uid, email in rows}


async def _record_bounce(session: AsyncSession, to_addr: str) -> None:
    email = (to_addr or "").strip().lower()
    if not email:
        return
    user = (
        await session.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == email, User.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if user is None:
        return
    recips = (
        (
            await session.execute(
                select(BlastRecipient).where(BlastRecipient.user_id == user.id, BlastRecipient.bounced.is_(False))
            )
        )
        .scalars()
        .all()
    )
    if recips:
        recips[0].bounced = True
    hard = int(
        (
            await session.execute(
                select(func.count()).where(BlastRecipient.user_id == user.id, BlastRecipient.bounced.is_(True))
            )
        ).scalar_one()
        or 0
    )
    if recips:
        hard += 1
    if hard >= 3 and user.profile is None:
        profile = (
            await session.execute(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        ).scalar_one_or_none()
        user.profile = profile
    if hard >= 3:
        profile = user.profile or (
            await session.execute(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        ).scalar_one_or_none()
        if profile:
            profile.email_alerts_enabled = False
            session.add(
                UserNote(
                    id=new_id(),
                    user_id=user.id,
                    author_id=user.id,
                    body="Auto: email alerts disabled after three hard bounces",
                    created_at=_now(),
                )
            )


async def ingest_inbound(session: AsyncSession, payload: dict) -> EmailLink:
    message_id = str(payload.get("message_id") or new_id()).strip()
    existing = (
        await session.execute(select(EmailLink).where(EmailLink.message_id == message_id))
    ).scalar_one_or_none()
    if existing:
        return existing

    from_addr = str(payload.get("from_addr") or "").strip()
    subject = str(payload.get("subject") or "")
    body = str(payload.get("body") or "")
    to_addr = str(payload.get("to_addr") or "")
    imap_uid = payload.get("imap_uid")
    bounce = bool(payload.get("bounce")) or is_bounce(from_addr, subject)

    known = await _known_emails(session)
    user_id = match_from_address(from_addr, known)
    token = match_thread_token(subject) or match_thread_token(body)
    thread_id = None
    deal_id = payload.get("deal_id")
    unmatched = True

    if token:
        thread = (await session.execute(select(Thread).where(Thread.id == token))).scalar_one_or_none()
        if thread:
            thread_id = thread.id
            deal_id = deal_id or thread.deal_id
            unmatched = False
            if user_id is None:
                user_id = thread.created_by

    if bounce:
        await _record_bounce(session, to_addr)
        unmatched = False

    if thread_id and user_id and not bounce:
        session.add(
            Message(
                id=new_id(),
                thread_id=thread_id,
                sender_id=user_id,
                body=body or subject or "(empty inbound)",
                created_at=_now(),
            )
        )
        part = (
            await session.execute(
                select(ThreadParticipant).where(
                    ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if part is None:
            session.add(ThreadParticipant(id=new_id(), thread_id=thread_id, user_id=user_id))

    if user_id and thread_id is None and not bounce:
        thread = Thread(
            id=new_id(),
            subject=subject or f"Email from {from_addr}",
            deal_id=deal_id,
            created_by=user_id,
            channel="email",
            created_at=_now(),
        )
        session.add(thread)
        await session.flush()
        thread_id = thread.id
        unmatched = False
        session.add(ThreadParticipant(id=new_id(), thread_id=thread.id, user_id=user_id))
        session.add(
            Message(
                id=new_id(),
                thread_id=thread.id,
                sender_id=user_id,
                body=body or subject or "(empty inbound)",
                created_at=_now(),
            )
        )

    link = EmailLink(
        id=new_id(),
        message_id=message_id,
        imap_uid=int(imap_uid) if imap_uid is not None else None,
        thread_id=thread_id,
        user_id=user_id,
        deal_id=deal_id,
        from_addr=from_addr,
        subject=subject,
        body=body,
        unmatched=unmatched and not bounce,
        bounce=bounce,
        created_at=_now(),
    )
    session.add(link)

    state = (await session.execute(select(MailboxState).where(MailboxState.id == "singleton"))).scalar_one_or_none()
    if state is None:
        state = MailboxState(id="singleton", last_imap_uid=0, last_error="")
        session.add(state)
    if imap_uid is not None:
        uid = int(imap_uid)
        if uid > (state.last_imap_uid or 0):
            state.last_imap_uid = uid
    state.last_sync_at = _now()
    state.last_error = ""
    await session.commit()
    return link


async def link_unmatched(
    session: AsyncSession,
    link_id: str,
    *,
    user_id: str | None,
    deal_id: str | None,
    thread_id: str | None,
) -> EmailLink:
    link = (await session.execute(select(EmailLink).where(EmailLink.id == link_id))).scalar_one_or_none()
    if link is None:
        from app.core.errors import AppError

        raise AppError(404, "not_found", "Inbound message not found")
    if thread_id:
        thread = (await session.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    else:
        thread = Thread(
            id=new_id(),
            subject=link.subject or "Linked inbound",
            deal_id=deal_id or link.deal_id,
            created_by=user_id or link.user_id or "unknown",
            channel="email",
            created_at=_now(),
        )
        if thread.created_by == "unknown":
            from app.core.errors import AppError

            raise AppError(422, "user_required", "Pick a buyer to attach this email")
        session.add(thread)
        await session.flush()
        thread_id = thread.id
        session.add(ThreadParticipant(id=new_id(), thread_id=thread.id, user_id=thread.created_by))
    if user_id:
        part = (
            await session.execute(
                select(ThreadParticipant).where(
                    ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if part is None:
            session.add(ThreadParticipant(id=new_id(), thread_id=thread_id, user_id=user_id))
        session.add(
            Message(
                id=new_id(),
                thread_id=thread_id,
                sender_id=user_id,
                body=link.body or link.subject or "(empty inbound)",
                created_at=_now(),
            )
        )
    link.thread_id = thread_id
    link.user_id = user_id or link.user_id
    link.deal_id = deal_id or link.deal_id
    link.unmatched = False
    await session.commit()
    return link


def poll_inbox(settings, *, last_uid: int = 0) -> list[dict]:
    """Live IMAP fetch. Empty credentials → no-op (sandbox)."""
    if not settings.mail_configured:
        return []
    import imaplib

    client = imaplib.IMAP4_SSL(settings.mail_imap_host, settings.mail_imap_port)
    try:
        client.login(settings.mail_username, settings.mail_password)
        client.select("INBOX")
        typ, data = client.uid("search", None, f"UID {last_uid + 1}:*")
        if typ != "OK" or not data or not data[0]:
            return []
        uids = [int(x) for x in data[0].split() if x]
        return [{"imap_uid": uid} for uid in uids if uid > last_uid]
    finally:
        with contextlib.suppress(Exception):
            client.logout()
