from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.cookies import cookie_names, set_csrf_cookie
from app.core.deps import enforce_csrf
from app.core.errors import AppError, app_error_handler
from app.core.kv import MemoryKV, MemoryLimiter, RedisKV
from app.core.logging import configure_logging
from app.core.migrate import upgrade_head
from app.core.redis_client import make_redis, ping_redis
from app.core.security import TokenError
from app.db.session import create_engine, create_session_factory, ping_database
from app.schemas.public import HealthResponse, VersionResponse
from app.services.bootstrap import seed_admin


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
    if resolved.sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=resolved.sentry_dsn, environment=resolved.environment, send_default_pii=False)
        except ImportError:
            pass
    app = FastAPI(
        title=resolved.public_brand_name,
        version=resolved.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/openapi.json",
    )
    app.state.settings = resolved
    _ensure_local_dirs(resolved)
    if resolved.database_url.startswith("sqlite"):
        upgrade_head(resolved)
        seed_admin(resolved)
    app.state.engine = create_engine(resolved)
    app.state.session_factory = create_session_factory(app.state.engine)
    app.state.redis = make_redis(resolved)
    app.state.kv = RedisKV(app.state.redis) if app.state.redis is not None else MemoryKV()
    app.state.limiter = MemoryLimiter()
    app.state.mail_outbox: list[dict[str, str]] = []
    app.add_exception_handler(AppError, app_error_handler)

    @app.exception_handler(TokenError)
    async def token_error_handler(_request: Request, exc: TokenError) -> JSONResponse:
        return JSONResponse(status_code=401, content={"code": exc.code, "message": str(exc)})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        hosts = " ".join(
            f"https://{h.strip()} https://www.{h.strip()}"
            for h in resolved.video_embed_hosts.split(",")
            if h.strip()
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com; "
            f"frame-src 'self' {hosts} https://player.vimeo.com https://my.matterport.com; "
            "connect-src 'self' https://nominatim.openstreetmap.org; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "script-src 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "same-origin"
        return response

    @app.middleware("http")
    async def csrf_middleware(request: Request, call_next: Callable) -> Response:
        try:
            enforce_csrf(request)
        except AppError as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"code": exc.code, "message": exc.message},
            )
        response = await call_next(request)
        names = cookie_names(request.app.state.settings)
        if names["csrf"] not in request.cookies and request.url.path.startswith("/api/"):
            from secrets import token_urlsafe

            set_csrf_cookie(response, request.app.state.settings, token_urlsafe(32))
        return response

    app.include_router(api_router)

    @app.get("/api/v1/internal/media-auth", tags=["ops"])
    async def media_auth(request: Request) -> JSONResponse:
        from app.core.cookies import cookie_names as cnames
        from app.services.auth import authenticate_access

        settings = request.app.state.settings
        names = cnames(settings)
        token = request.cookies.get(names["access"])
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
        if not token:
            return JSONResponse(status_code=401, content={"code": "token_invalid"})
        async with request.app.state.session_factory() as session:
            try:
                user, _claims = await authenticate_access(session, settings, request.app.state.kv, token)
            except AppError as exc:
                return JSONResponse(status_code=exc.status_code, content={"code": exc.code})
        if user.status != "active" and user.role != "admin":
            return JSONResponse(status_code=401, content={"code": "token_invalid"})
        return JSONResponse(status_code=200, content={"ok": True})

    @app.get("/media/{key:path}", tags=["ops"])
    async def media(key: str, request: Request):
        from fastapi.responses import FileResponse

        from app.integrations.storage import build_storage
        from app.services.media import media_path

        auth = await media_auth(request)
        if auth.status_code != 200:
            return auth
        storage = build_storage(request.app.state.settings)
        path = media_path(storage, key)
        return FileResponse(path)

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
