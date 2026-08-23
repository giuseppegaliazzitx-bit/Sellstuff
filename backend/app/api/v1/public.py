from fastapi import APIRouter, Request

from app.schemas.public import PublicConfig

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/config", response_model=PublicConfig)
async def public_config(request: Request) -> PublicConfig:
    settings = request.app.state.settings
    return PublicConfig.model_validate(settings.public_config())
