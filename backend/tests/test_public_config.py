"""P0-T6."""

from __future__ import annotations

from app.core.config import get_settings
from app.main import create_app
from httpx import ASGITransport, AsyncClient


async def test_public_config_returns_brand(client: AsyncClient) -> None:
    res = await client.get("/api/v1/public/config")
    assert res.status_code == 200
    body = res.json()
    assert body["brand_name"] == "Northstar Dispo"
    assert body["primary_state"] == "TX"
    assert "rehab" not in body
    assert "assignment_fee" not in body


async def test_public_config_follows_env_without_rebuild() -> None:
    settings = get_settings().model_copy(update={"public_brand_name": "Prairie Desk"})
    app = create_app(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/public/config")
    assert res.status_code == 200
    assert res.json()["brand_name"] == "Prairie Desk"
