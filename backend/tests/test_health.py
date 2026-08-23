"""P0-T2, P0-T3, P0-T9."""

from __future__ import annotations

from app.core.config import get_settings
from app.main import create_app
from httpx import ASGITransport, AsyncClient


async def test_healthz_200_when_db_pings(client: AsyncClient) -> None:
    res = await client.get("/healthz")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["redis"] == "skipped"


async def test_healthz_503_when_database_url_is_wrong() -> None:
    settings = get_settings().model_copy(update={"database_url": "postgresql+psycopg://nope:nope@127.0.0.1:1/nope"})
    app = create_app(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/healthz")
    assert res.status_code == 503
    assert res.json()["db"] == "down"


async def test_version_endpoint(client: AsyncClient) -> None:
    res = await client.get("/version")
    assert res.status_code == 200
    body = res.json()
    assert "version" in body
    assert "commit" in body
    assert body["environment"] == "local"


async def test_redis_skipped_when_url_empty(client: AsyncClient) -> None:
    """P0-T9 local-first: no Redis installed → skipped, not a failure."""
    res = await client.get("/healthz")
    assert res.json()["redis"] == "skipped"
