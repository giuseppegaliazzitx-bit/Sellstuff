from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.redis_client import make_redis, ping_redis
from app.db.session import create_engine, create_session_factory, ping_database
from app.schemas.public import HealthResponse, VersionResponse


def _ensure_local_dirs(settings: Settings) -> None:
    if settings.database_url.startswith("sqlite"):
        Path("data").mkdir(parents=True, exist_ok=True)
    Path(settings.local_media_dir).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    configure_logging(settings.log_level)
    _ensure_local_dirs(settings)
    try:
        yield
    finally:
        redis = app.state.redis
        if redis is not None:
            await redis.aclose()
        await app.state.engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    app = FastAPI(
        title=resolved.public_brand_name,
        version=resolved.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/openapi.json",
    )
    app.state.settings = resolved
    # Engine is created here so /healthz works even if the ASGI server
    # has not entered lifespan yet (httpx ASGITransport in tests).
    _ensure_local_dirs(resolved)
    app.state.engine = create_engine(resolved)
    app.state.session_factory = create_session_factory(app.state.engine)
    app.state.redis = make_redis(resolved)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/healthz", response_model=HealthResponse, tags=["ops"])
    async def healthz(request: Request) -> JSONResponse:
        engine: AsyncEngine = request.app.state.engine
        db_status = "ok"
        try:
            await ping_database(engine)
        except Exception:
            db_status = "down"
        redis_status = await ping_redis(request.app.state.redis)
        body = HealthResponse(
            status="ok" if db_status == "ok" else "unhealthy",
            db=db_status,
            redis=redis_status,
        )
        code = 200 if db_status == "ok" else 503
        return JSONResponse(status_code=code, content=body.model_dump())

    @app.get("/version", response_model=VersionResponse, tags=["ops"])
    async def version(request: Request) -> VersionResponse:
        s: Settings = request.app.state.settings
        return VersionResponse(
            version=s.app_version,
            commit=s.app_commit,
            environment=s.environment,
        )

    return app


app = create_app()


def get_session_factory(request: Request) -> async_sessionmaker:
    return request.app.state.session_factory
