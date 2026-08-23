from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.deps import get_db, get_settings_dep, require_admin
from app.core.errors import AppError
from app.integrations.geocode import geocode_address
from app.models import BlastCampaign, User
from app.schemas.auth import BuyerOut
from app.services.blasts import create_campaign, send_campaign
from app.services.deals import get_deal, to_admin
from app.services.import_buyers import commit_import, preview_csv
from app.services.match import estimate_finish
from app.services.users import list_buyers

router = APIRouter(tags=["admin-extra"])


@router.post("/admin/users/import")
async def import_preview(
    payload: dict,
    _admin: User = Depends(require_admin),
) -> dict:
    csv_text = str(payload.get("csv") or "")
    return preview_csv(csv_text)


@router.post("/admin/users/import/commit")
async def import_commit(
    payload: dict,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    rows = payload.get("rows") or []
    n = await commit_import(session, rows)
    return {"imported": n}


@router.get("/admin/users")
async def admin_users(
    status: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[BuyerOut]:
    rows = await list_buyers(session, status)
    out = []
    for u in rows:
        p = u.profile
        if tag and (not p or tag not in (p.tags or [])):
            continue
        if q:
            blob = f"{u.name} {u.email} {u.phone_raw}".lower()
            if q.lower() not in blob:
                continue
        out.append(
            BuyerOut(
                id=u.id,
                email=u.email,
                name=u.name,
                status=u.status,
                role=u.role,
                email_verified=u.email_verified_at is not None,
                company=p.company if p else None,
                lead_source=p.lead_source if p else None,
                created_at=u.created_at,
                phone=u.phone_raw,
            )
        )
    return out


@router.post("/admin/deals/{deal_id}/geocode")
async def geocode_deal(
    deal_id: str,
    request: Request,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
):
    deal = await get_deal(session, deal_id)
    q = f"{deal.address1}, {deal.city}, {deal.state} {deal.postal_code}"
    client = getattr(request.app.state, "httpx_client", None)
    result = await geocode_address(session, settings, q, client=client)
    if result is None:
        raise AppError(404, "geocode_failed", "Nominatim returned no result")
    deal.lat, deal.lng = result
    await session.commit()
    return to_admin(await get_deal(session, deal.id))


@router.post("/admin/blasts")
async def blast_create(
    payload: dict,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> dict:
    camp = await create_campaign(
        session,
        settings,
        admin_id=admin.id,
        subject=str(payload.get("subject") or "New deal"),
        body=str(payload.get("body") or ""),
        deal_id=payload.get("deal_id"),
        segment=payload.get("segment") or {},
    )
    return {
        "id": camp.id,
        "total": camp.total,
        "status": camp.status,
        "estimated_finish_at": camp.estimated_finish_at.isoformat() if camp.estimated_finish_at else None,
    }


@router.get("/admin/blasts")
async def blast_list(
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (await session.execute(select(BlastCampaign).order_by(BlastCampaign.created_at.desc()))).scalars().all()
    return [
        {
            "id": c.id,
            "subject": c.subject,
            "status": c.status,
            "total": c.total,
            "sent": c.sent,
            "clicked": c.clicked,
            "estimated_finish_at": c.estimated_finish_at.isoformat() if c.estimated_finish_at else None,
        }
        for c in rows
    ]


@router.post("/admin/blasts/{cid}/send")
async def blast_send(
    cid: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings_dep),
) -> dict:
    camp = (await session.execute(select(BlastCampaign).where(BlastCampaign.id == cid))).scalar_one_or_none()
    if camp is None:
        raise AppError(404, "not_found", "Campaign not found")
    camp = await send_campaign(session, settings, camp)
    return {"id": camp.id, "status": camp.status, "sent": camp.sent, "total": camp.total}


@router.post("/admin/blasts/{cid}/pause")
async def blast_pause(
    cid: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    camp = (await session.execute(select(BlastCampaign).where(BlastCampaign.id == cid))).scalar_one_or_none()
    if camp is None:
        raise AppError(404, "not_found", "Campaign not found")
    camp.status = "paused"
    await session.commit()
    return {"id": camp.id, "status": camp.status}


@router.get("/admin/blasts/estimate")
async def blast_estimate(
    n: int = 0,
    settings: Settings = Depends(get_settings_dep),
    _admin: User = Depends(require_admin),
) -> dict:
    finish = estimate_finish(n, daily_limit=settings.mail_daily_limit, per_minute=settings.mail_rate_per_minute)
    return {"estimated_finish_at": finish.isoformat(), "n": n}
