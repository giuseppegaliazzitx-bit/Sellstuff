from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_active, require_admin, require_user
from app.core.errors import AppError
from app.core.security import TokenError, decode_jwt
from app.models import (
    BlastCampaign,
    BlastRecipient,
    ContactEvent,
    DealAcknowledgment,
    EmailLink,
    Event,
    MailboxState,
    Message,
    Notification,
    Offer,
    Outbox,
    ShowingRsvp,
    ShowingWindow,
    Thread,
    ThreadParticipant,
    User,
    UserNote,
    new_id,
)
from app.services.deals import get_deal
from app.services.status import assert_transition

router = APIRouter(tags=["desk"])

OFFER_TRANSITIONS = {
    "submitted": {"countered", "accepted", "backup", "rejected", "withdrawn", "expired"},
    "countered": {"submitted", "accepted", "backup", "rejected", "withdrawn"},
    "backup": {"accepted", "rejected", "withdrawn"},
    "accepted": set(),
    "rejected": set(),
    "withdrawn": set(),
    "expired": set(),
}


def _now() -> datetime:
    return datetime.now(UTC)


# --- chat ---
@router.get("/threads")
async def threads(
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    if user.role == "admin":
        rows = (await session.execute(select(Thread).order_by(Thread.created_at.desc()))).scalars().all()
    else:
        ids = (
            (await session.execute(select(ThreadParticipant.thread_id).where(ThreadParticipant.user_id == user.id)))
            .scalars()
            .all()
        )
        rows = (await session.execute(select(Thread).where(Thread.id.in_(ids or ["__none__"])))).scalars().all()
    return [{"id": t.id, "subject": t.subject, "deal_id": t.deal_id, "channel": t.channel} for t in rows]


@router.post("/threads")
async def create_thread(
    payload: dict,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    thread = Thread(
        id=new_id(),
        subject=str(payload.get("subject") or "Chat"),
        deal_id=payload.get("deal_id"),
        created_by=user.id,
        channel="chat",
        created_at=_now(),
    )
    session.add(thread)
    await session.flush()
    seen: set[str] = set()
    session.add(ThreadParticipant(id=new_id(), thread_id=thread.id, user_id=user.id))
    seen.add(user.id)
    admins = (
        (await session.execute(select(User).where(User.role == "admin", User.deleted_at.is_(None)))).scalars().all()
    )
    for admin in admins:
        if admin.id in seen:
            continue
        seen.add(admin.id)
        session.add(ThreadParticipant(id=new_id(), thread_id=thread.id, user_id=admin.id))
        session.add(
            Notification(
                id=new_id(),
                user_id=admin.id,
                type="chat.new",
                payload={"thread_id": thread.id},
                created_at=_now(),
            )
        )
    session.add(
        Outbox(
            id=new_id(),
            kind="notification.push",
            payload={"thread_id": thread.id},
            created_at=_now(),
        )
    )
    await session.commit()
    return {"id": thread.id}


@router.get("/threads/{thread_id}/messages")
async def list_messages(
    thread_id: str,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    part = (
        await session.execute(
            select(ThreadParticipant).where(
                ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if part is None and user.role != "admin":
        raise AppError(403, "forbidden", "Not a participant")
    rows = (
        (await session.execute(select(Message).where(Message.thread_id == thread_id).order_by(Message.created_at)))
        .scalars()
        .all()
    )
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "body": m.body,
            "created_at": m.created_at.isoformat(),
        }
        for m in rows
    ]


@router.post("/threads/{thread_id}/messages")
async def post_message(
    thread_id: str,
    payload: dict,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    body = str(payload.get("body") or "").strip()
    if not body:
        raise AppError(422, "empty_body", "Message body required")
    part = (
        await session.execute(
            select(ThreadParticipant).where(
                ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if part is None and user.role != "admin":
        raise AppError(403, "forbidden", "Not a participant")
    msg = Message(
        id=new_id(),
        thread_id=thread_id,
        sender_id=user.id,
        body=body,
        created_at=_now(),
    )
    session.add(msg)
    await session.commit()
    return {"id": msg.id}


@router.get("/me/notifications")
async def my_notes(
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        (
            await session.execute(
                select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": n.id,
            "type": n.type,
            "payload": n.payload,
            "read": n.read_at is not None,
            "created_at": n.created_at.isoformat(),
        }
        for n in rows
    ]


@router.post("/me/notifications/read-all")
async def read_all_notes(
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    rows = (
        (
            await session.execute(
                select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
            )
        )
        .scalars()
        .all()
    )
    now = _now()
    for row in rows:
        row.read_at = now
    await session.commit()
    return {"ok": True, "n": len(rows)}


@router.post("/me/notifications/{nid}/read")
async def read_note(
    nid: str,
    user: User = Depends(require_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    row = (
        await session.execute(select(Notification).where(Notification.id == nid, Notification.user_id == user.id))
    ).scalar_one_or_none()
    if row:
        row.read_at = _now()
        await session.commit()
    return {"ok": True}


# --- offers ---
@router.post("/deals/{deal_id}/offers")
async def create_offer(
    deal_id: str,
    payload: dict,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    deal = await get_deal(session, deal_id)
    amount = int(payload.get("amount_cents") or 0)
    if amount < 100:
        raise AppError(422, "offer_too_low", "Offer must be at least $1")
    notice = (
        await session.execute(
            select(DealAcknowledgment)
            .where(DealAcknowledgment.user_id == user.id, DealAcknowledgment.deal_id == deal_id)
            .order_by(DealAcknowledgment.accepted_at.desc())
        )
    ).scalar_one_or_none()
    if deal.market and deal.market.state == "TX" and notice is None:
        raise AppError(409, "acknowledgment_required", "Acknowledge the Texas notice first")
    open_row = (
        await session.execute(
            select(Offer).where(
                Offer.user_id == user.id,
                Offer.deal_id == deal_id,
                Offer.status.in_(("submitted", "countered", "backup")),
            )
        )
    ).scalar_one_or_none()
    if open_row:
        raise AppError(409, "offer_exists", "Withdraw the open offer first")
    due = deal.offers_due_at
    is_late = bool(due and (due if due.tzinfo else due.replace(tzinfo=UTC)) < _now())
    offer = Offer(
        id=new_id(),
        deal_id=deal_id,
        user_id=user.id,
        amount_cents=amount,
        emd_cents=int(payload.get("emd_cents") or 0),
        close_days=int(payload.get("close_days") or 14),
        funding=str(payload.get("funding") or "cash"),
        inspection_days=int(payload.get("inspection_days") or 0),
        message=str(payload.get("message") or ""),
        is_late=is_late,
        created_at=_now(),
    )
    session.add(offer)
    await session.commit()
    return {"id": offer.id, "status": offer.status, "is_late": offer.is_late}


@router.get("/me/offers")
async def my_offers(
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (await session.execute(select(Offer).where(Offer.user_id == user.id))).scalars().all()
    return [{"id": o.id, "deal_id": o.deal_id, "amount_cents": o.amount_cents, "status": o.status} for o in rows]


@router.post("/offers/{offer_id}/withdraw")
async def withdraw(
    offer_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    offer = (await session.execute(select(Offer).where(Offer.id == offer_id))).scalar_one_or_none()
    if offer is None or offer.user_id != user.id:
        raise AppError(404, "not_found", "Offer not found")
    if offer.status not in {"submitted", "countered"}:
        raise AppError(409, "offer_transition_invalid", "Cannot withdraw")
    offer.status = "withdrawn"
    await session.commit()
    return {"status": offer.status}


@router.get("/admin/offers")
async def admin_offers(
    deal_id: str | None = None,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Offer)
    if deal_id:
        stmt = stmt.where(Offer.deal_id == deal_id)
    rows = (await session.execute(stmt)).scalars().all()
    rows = sorted(rows, key=lambda o: (o.is_late, -o.amount_cents))
    return [
        {
            "id": o.id,
            "deal_id": o.deal_id,
            "user_id": o.user_id,
            "amount_cents": o.amount_cents,
            "emd_cents": o.emd_cents,
            "status": o.status,
            "rank": o.rank,
            "is_late": o.is_late,
        }
        for o in rows
    ]


@router.patch("/admin/offers/{offer_id}")
async def admin_offer_patch(
    offer_id: str,
    payload: dict,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    offer = (await session.execute(select(Offer).where(Offer.id == offer_id))).scalar_one_or_none()
    if offer is None:
        raise AppError(404, "not_found", "Offer not found")
    target = payload.get("status")
    if target:
        if target not in OFFER_TRANSITIONS.get(offer.status, set()):
            raise AppError(409, "offer_transition_invalid", f"{offer.status} → {target}")
        offer.status = target
        if target == "accepted":
            deal = await get_deal(session, offer.deal_id)
            if deal.status == "available":
                assert_transition(deal.status, "pending")
                deal.status = "pending"
    if "rank" in payload:
        offer.rank = payload["rank"]
    if "counter_amount_cents" in payload:
        offer.counter_amount_cents = payload["counter_amount_cents"]
        offer.counter_note = str(payload.get("counter_note") or "")
        session.add(
            Notification(
                id=new_id(),
                user_id=offer.user_id,
                type="offer.countered",
                payload={"amount": offer.counter_amount_cents},
                created_at=_now(),
            )
        )
    await session.commit()
    return {"id": offer.id, "status": offer.status, "rank": offer.rank}


# --- showings ---
@router.get("/deals/{deal_id}/showing-windows")
async def windows(
    deal_id: str,
    _user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (await session.execute(select(ShowingWindow).where(ShowingWindow.deal_id == deal_id))).scalars().all()
    return [
        {
            "id": w.id,
            "starts_at": w.starts_at.isoformat(),
            "ends_at": w.ends_at.isoformat(),
            "capacity": w.capacity,
            "status": w.status,
            "notes": w.notes,
        }
        for w in rows
    ]


@router.post("/admin/deals/{deal_id}/showing-windows")
async def create_window(
    deal_id: str,
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    deal = await get_deal(session, deal_id)
    if deal.access == "drive_by_only":
        raise AppError(409, "drive_by_only", "No showings on drive-by-only deals")
    win = ShowingWindow(
        id=new_id(),
        deal_id=deal_id,
        starts_at=datetime.fromisoformat(payload["starts_at"]),
        ends_at=datetime.fromisoformat(payload["ends_at"]),
        capacity=int(payload.get("capacity") or 6),
        notes=str(payload.get("notes") or ""),
    )
    session.add(win)
    await session.commit()
    return {"id": win.id}


@router.post("/showing-windows/{window_id}/rsvp")
async def rsvp(
    window_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    win = (await session.execute(select(ShowingWindow).where(ShowingWindow.id == window_id))).scalar_one_or_none()
    if win is None:
        raise AppError(404, "not_found", "Window not found")
    count = (
        await session.execute(
            select(func.count()).where(ShowingRsvp.window_id == window_id, ShowingRsvp.status != "declined")
        )
    ).scalar_one()
    if int(count or 0) >= win.capacity:
        raise AppError(409, "window_full", "This window is full")
    existing = (
        await session.execute(
            select(ShowingRsvp).where(ShowingRsvp.window_id == window_id, ShowingRsvp.user_id == user.id)
        )
    ).scalar_one_or_none()
    if existing:
        existing.status = "confirmed"
    else:
        session.add(ShowingRsvp(id=new_id(), window_id=window_id, user_id=user.id, status="confirmed"))
    await session.commit()
    return {"ok": True}


@router.delete("/showing-windows/{window_id}/rsvp")
async def rsvp_delete(
    window_id: str,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    existing = (
        await session.execute(
            select(ShowingRsvp).where(ShowingRsvp.window_id == window_id, ShowingRsvp.user_id == user.id)
        )
    ).scalar_one_or_none()
    if existing:
        existing.status = "declined"
        await session.commit()
    return {"ok": True}


# --- CRM notes ---
@router.post("/admin/users/{user_id}/notes")
async def add_note(
    user_id: str,
    payload: dict,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    body = str(payload.get("body") or "").strip()
    if not body:
        raise AppError(422, "empty_body", "Note required")
    note = UserNote(id=new_id(), user_id=user_id, author_id=admin.id, body=body, created_at=_now())
    session.add(note)
    await session.commit()
    return {"id": note.id}


@router.get("/admin/users/{user_id}/notes")
async def list_notes(
    user_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        (await session.execute(select(UserNote).where(UserNote.user_id == user_id).order_by(UserNote.created_at)))
        .scalars()
        .all()
    )
    return [
        {
            "id": n.id,
            "body": n.body,
            "author_id": n.author_id,
            "created_at": n.created_at.isoformat(),
        }
        for n in rows
    ]


# --- mail sandbox ---
@router.get("/mail/status")
async def mail_status(
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    settings = request.app.state.settings
    dead = (await session.execute(select(func.count()).where(Outbox.dead_at.is_not(None)))).scalar_one()
    state = (await session.execute(select(MailboxState).where(MailboxState.id == "singleton"))).scalar_one_or_none()
    return {
        "configured": settings.mail_configured,
        "sandbox": not settings.mail_configured,
        "sent_today": state.sent_today if state else 0,
        "daily_limit": settings.mail_daily_limit,
        "dead_letters": int(dead or 0),
        "last_error": state.last_error if state else "",
        "last_imap_uid": state.last_imap_uid if state else 0,
        "last_sync_at": state.last_sync_at.isoformat() if state and state.last_sync_at else None,
        "brand_name": settings.public_brand_name,
        "brand_tagline": settings.public_brand_tagline,
        "mailing_address": settings.public_mailing_address,
    }


@router.post("/admin/mail/ingest")
async def mail_ingest(
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.imap_inbound import ingest_inbound

    link = await ingest_inbound(session, payload)
    return {
        "id": link.id,
        "unmatched": link.unmatched,
        "bounce": link.bounce,
        "thread_id": link.thread_id,
        "user_id": link.user_id,
    }


@router.get("/admin/mail/unmatched")
async def mail_unmatched(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        (
            await session.execute(
                select(EmailLink).where(EmailLink.unmatched.is_(True)).order_by(EmailLink.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": r.id,
            "from_addr": r.from_addr,
            "subject": r.subject,
            "body": r.body,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/admin/mail/{link_id}/link")
async def mail_link(
    link_id: str,
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.imap_inbound import link_unmatched

    link = await link_unmatched(
        session,
        link_id,
        user_id=payload.get("user_id"),
        deal_id=payload.get("deal_id"),
        thread_id=payload.get("thread_id"),
    )
    return {"id": link.id, "thread_id": link.thread_id, "unmatched": link.unmatched}


@router.get("/admin/users/{user_id}/activity")
async def buyer_activity(
    user_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    events = (
        (await session.execute(select(Event).where(Event.user_id == user_id).order_by(Event.at.desc()).limit(50)))
        .scalars()
        .all()
    )
    contacts = (
        (
            await session.execute(
                select(ContactEvent).where(ContactEvent.user_id == user_id).order_by(ContactEvent.at.desc()).limit(50)
            )
        )
        .scalars()
        .all()
    )
    offers = (await session.execute(select(Offer).where(Offer.user_id == user_id))).scalars().all()
    out = [
        {"kind": "event", "name": e.name, "deal_id": e.deal_id, "at": e.at.isoformat(), "payload": e.payload}
        for e in events
    ]
    out.extend(
        {
            "kind": "contact",
            "name": c.kind,
            "deal_id": c.deal_id,
            "at": c.at.isoformat(),
            "payload": {},
        }
        for c in contacts
    )
    out.extend(
        {
            "kind": "offer",
            "name": o.status,
            "deal_id": o.deal_id,
            "at": o.created_at.isoformat(),
            "payload": {"amount_cents": o.amount_cents},
        }
        for o in offers
    )
    out.sort(key=lambda r: r["at"], reverse=True)
    return out[:80]


@router.post("/mail/outbound")
async def mail_out(
    payload: dict,
    request: Request,
    user: User = Depends(require_active),
    session: AsyncSession = Depends(get_db),
) -> dict:
    settings = request.app.state.settings
    lane = int(payload.get("lane") or 2)
    if lane == 2 and not settings.public_mailing_address:
        raise AppError(409, "mailing_address_required", "Set PUBLIC_MAILING_ADDRESS before blasts")
    from app.integrations.mail import build_mail_provider

    body = str(payload.get("body") or "Hello")
    to_addr = str(payload.get("to") or settings.public_support_email or "sandbox@localhost")
    provider = build_mail_provider(settings)
    eml_name = provider.send(to_addr=to_addr, subject=str(payload.get("subject") or ""), body=body)
    session.add(
        Outbox(
            id=new_id(),
            kind="mail.send",
            payload={"to": to_addr, "file": eml_name},
            sent_at=_now() if not settings.mail_configured else None,
            created_at=_now(),
        )
    )
    await session.commit()
    return {"sandbox": not settings.mail_configured, "file": eml_name}


@router.get("/admin/metrics/overview")
async def metrics(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.metrics import overview

    return await overview(session)


@router.post("/admin/jobs/nightly")
async def nightly_jobs(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.metrics import notify_contract_clock

    n = await notify_contract_clock(session)
    return {"contract_expiring": n}


@router.get("/t/{token}")
async def track_click(token: str, request: Request, session: AsyncSession = Depends(get_db)):
    settings = request.app.state.settings
    try:
        claims = decode_jwt(settings, token, expected_typ="track")
    except TokenError:
        return RedirectResponse("/app/browse")
    camp_id = str(claims.get("campaign") or "")
    user_id = str(claims.get("sub") or "")
    if camp_id and user_id:
        recip = (
            await session.execute(
                select(BlastRecipient).where(BlastRecipient.campaign_id == camp_id, BlastRecipient.user_id == user_id)
            )
        ).scalar_one_or_none()
        if recip and recip.clicked_at is None:
            recip.clicked_at = _now()
            camp = (
                await session.execute(select(BlastCampaign).where(BlastCampaign.id == camp_id))
            ).scalar_one_or_none()
            if camp:
                camp.clicked += 1
    session.add(
        Outbox(
            id=new_id(),
            kind="blast.clicked",
            payload={"sub": claims.get("sub"), "deal": claims.get("deal"), "campaign": camp_id},
            created_at=_now(),
        )
    )
    await session.commit()
    deal = claims.get("deal") or ""
    return RedirectResponse(f"/app/deals/{deal}")


@router.get("/u/{token}")
async def unsubscribe(token: str, request: Request, session: AsyncSession = Depends(get_db)):
    settings = request.app.state.settings
    try:
        claims = decode_jwt(settings, token, expected_typ="unsub")
    except TokenError:
        raise AppError(400, "token_invalid", "Invalid unsubscribe token") from None
    if claims.get("typ") == "access":
        raise AppError(400, "token_invalid", "Wrong token type")
    user = (await session.execute(select(User).where(User.id == str(claims["sub"])))).scalar_one_or_none()
    if user and user.profile:
        user.profile.email_alerts_enabled = False
        await session.commit()
    return JSONResponse({"ok": True, "unsubscribed": True})
