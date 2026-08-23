from __future__ import annotations

from datetime import UTC, datetime

import httpx
import pytest
from app.db.session import to_sync_url
from app.main import create_app
from app.models import BuyerProfile, Deal, Market, User, new_id
from app.services.import_buyers import preview_csv
from app.services.match import buy_box_matches, estimate_finish
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"
PASSWORD = "correct-horse-battery"


def test_buy_box_price_and_market() -> None:
    market = Market(id="m1", slug="dallas", name="Dallas", state="TX", center_lat=0, center_lng=0)
    cheap = Deal(
        id="d1",
        market_id="m1",
        status="available",
        list_price_cents=7_000_000,
        arv_cents=10_000_000,
        address1="x",
        city="Dallas",
        state="TX",
        property_type="SFR",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    cheap.market = market
    user = User(
        id="u1",
        email="a@b.com",
        password_hash="x",
        role="client",
        status="active",
        name="A",
        created_at=datetime.utcnow(),
    )
    user.profile = BuyerProfile(
        user_id="u1",
        max_price_cents=10_000_000,
        markets=["Dallas"],
        asset_types=["SFR"],
        email_alerts_enabled=True,
        do_not_contact=False,
    )
    assert buy_box_matches(cheap, user) is True
    user.profile.max_price_cents = 5_000_000
    assert buy_box_matches(cheap, user) is False
    user.profile.max_price_cents = 10_000_000
    user.profile.markets = ["Houston"]
    assert buy_box_matches(cheap, user) is False


def test_estimate_1400_recipients() -> None:
    finish = estimate_finish(
        1400,
        daily_limit=450,
        per_minute=20,
        now=datetime(2026, 1, 1, tzinfo=UTC),
    )
    # 1400/450 = 4 days of cap
    assert finish.day >= 4


def test_csv_preview() -> None:
    raw = "email,name,phone,tier\nok@x.com,Ann,2145551212,A\nbad@x.com,Bob,12,B\n"
    out = preview_csv(raw)
    assert len(out["valid"]) == 1
    assert len(out["errors"]) == 1


@pytest.fixture
async def admin_env(settings, tmp_path):
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "public_mailing_address": "123 Main, Dallas TX",
            "local_media_dir": str(tmp_path / "media"),
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
        )
        token = client.cookies.get("access")
        yield s, app, client, token


async def test_import_and_claim(admin_env) -> None:
    _s, _app, client, token = admin_env
    h = {"Authorization": f"Bearer {token}"}
    preview = await client.post(
        "/api/v1/admin/users/import",
        headers=h,
        json={"csv": "email,name,phone\nclaim@x.com,Claim,2145559999\nbad@x.com,Bad,12\n"},
    )
    assert preview.status_code == 200
    assert len(preview.json()["valid"]) == 1
    assert len(preview.json()["errors"]) == 1
    commit = await client.post(
        "/api/v1/admin/users/import/commit",
        headers=h,
        json={"rows": preview.json()["valid"]},
    )
    assert commit.json()["imported"] == 1
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "claim@x.com",
            "password": PASSWORD,
            "full_name": "Claimed",
            "terms_version": "2026-08-22",
        },
    )
    assert reg.status_code == 200
    assert reg.json()["status"] == "active"


async def test_blast_requires_mailing_address(settings) -> None:
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "public_mailing_address": "",
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
        )
        token = client.cookies.get("access")
        created = await client.post(
            "/api/v1/admin/blasts",
            headers={"Authorization": f"Bearer {token}"},
            json={"subject": "Hi", "body": "x"},
        )
        assert created.status_code == 200
        sent = await client.post(
            f"/api/v1/admin/blasts/{created.json()['id']}/send",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert sent.status_code == 409
        assert sent.json()["code"] == "mailing_address_required"


async def test_geocode_mocked(admin_env) -> None:
    s, app, client, token = admin_env
    engine = create_engine(to_sync_url(s.database_url))
    with Session(engine) as session:
        m = Market(
            id=new_id(),
            slug="dallas-g",
            name="Dallas",
            state="TX",
            center_lat=32.7,
            center_lng=-96.8,
        )
        session.add(m)
        session.commit()
        mid = m.id
    engine.dispose()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[{"lat": "32.78", "lon": "-96.80"}])

    transport = httpx.MockTransport(handler)
    app.state.httpx_client = httpx.AsyncClient(transport=transport)
    h = {"Authorization": f"Bearer {token}"}
    created = await client.post(
        "/api/v1/admin/deals",
        headers=h,
        json={
            "market_id": mid,
            "list_price_cents": 100000,
            "arv_cents": 200000,
            "address1": "916 Eldridge St",
            "city": "Dallas",
            "state": "TX",
        },
    )
    geo = await client.post(f"/api/v1/admin/deals/{created.json()['id']}/geocode", headers=h)
    assert geo.status_code == 200, geo.text
    assert geo.json()["lat"] == pytest.approx(32.78)
    await app.state.httpx_client.aclose()
