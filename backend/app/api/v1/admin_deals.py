from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.integrations.storage import build_storage
from app.models import DealDocument, DealPhoto, User, new_id
from app.schemas.deals import DealAdmin, DealCreate, DealPatch
from app.services.deals import (
    create_deal,
    get_deal,
    list_admin_deals,
    patch_deal,
    soft_delete,
    to_admin,
)
from app.services.media import process_photo, store_pdf

router = APIRouter(prefix="/admin/deals", tags=["admin-deals"])


@router.get("", response_model=list[DealAdmin])
async def admin_list(
    deleted: bool = Query(default=False),
    q: str | None = None,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> list[DealAdmin]:
    deals = await list_admin_deals(session, deleted=deleted, q=q)
    return [to_admin(d) for d in deals]


@router.post("", response_model=DealAdmin)
async def admin_create(
    payload: DealCreate,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> DealAdmin:
    deal = await create_deal(session, payload, admin.id)
    return to_admin(deal)


@router.get("/{deal_id}", response_model=DealAdmin)
async def admin_get(
    deal_id: str,
    deleted: bool = False,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> DealAdmin:
    deal = await get_deal(session, deal_id, include_deleted=deleted)
    return to_admin(deal)


@router.patch("/{deal_id}", response_model=DealAdmin)
async def admin_patch(
    deal_id: str,
    payload: DealPatch,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> DealAdmin:
    deal = await get_deal(session, deal_id)
    deal = await patch_deal(
        session,
        deal,
        payload,
        admin.id,
        ip=request.client.host if request.client else "",
    )
    return to_admin(deal)


@router.delete("/{deal_id}")
async def admin_delete(
    deal_id: str,
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> dict:
    deal = await get_deal(session, deal_id)
    await soft_delete(session, deal)
    return {"deleted": True}


@router.post("/{deal_id}/photos", response_model=DealAdmin)
async def upload_photo(
    deal_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> DealAdmin:
    deal = await get_deal(session, deal_id)
    data = await file.read()
    photo_id = new_id()
    storage = build_storage(request.app.state.settings)
    keys = process_photo(storage, deal.id, photo_id, data)
    is_cover = len(deal.photos) == 0
    session.add(
        DealPhoto(
            id=photo_id,
            deal_id=deal.id,
            sort_order=len(deal.photos),
            is_cover=is_cover,
            key_full=keys["full"],
            key_card=keys.get("card") or keys["full"],
            key_thumb=keys.get("thumb") or keys["full"],
            content_type=keys.get("content_type") or "image/jpeg",
        )
    )
    if is_cover:
        deal.cover_photo_id = photo_id
    await session.commit()
    return to_admin(await get_deal(session, deal.id))


@router.post("/{deal_id}/documents")
async def upload_doc(
    deal_id: str,
    request: Request,
    kind: str = "packet",
    _admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    deal = await get_deal(session, deal_id)
    data = await file.read()
    doc_id = new_id()
    storage = build_storage(request.app.state.settings)
    key = store_pdf(storage, deal.id, doc_id, data)
    session.add(
        DealDocument(
            id=doc_id,
            deal_id=deal.id,
            kind=kind,
            filename=file.filename or "packet.pdf",
            storage_key=key,
        )
    )
    await session.commit()
    return {"id": doc_id, "filename": file.filename}
