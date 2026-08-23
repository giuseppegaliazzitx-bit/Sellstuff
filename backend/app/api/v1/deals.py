from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import require_active
from app.models import User

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("")
async def list_deals(_user: User = Depends(require_active)) -> list:
    """Phase 1 stub: empty list so approve → browse has somewhere to land."""
    return []
