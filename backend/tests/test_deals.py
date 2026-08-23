from __future__ import annotations

from io import BytesIO

import pytest
from app.core.denylist import DENYLIST, assert_public_clean
from app.db.session import to_sync_url
from app.main import create_app
from app.models import Market, new_id
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ADMIN_PASSWORD = "correct-horse-admin1"
PASSWORD = "correct-horse-battery"


def _jpeg() -> bytes:
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (40, 30), (120, 40, 40)).save(buf, format="JPEG")
    return buf.getvalue()


def _pdf() -> bytes:
    return b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.fixture
async def admin_env(settings):
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
        }
    )
    app = create_app(s)
    engine = create_engine(to_sync_url(s.database_url))
    with Session(engine) as session:
        m = Market(
            id=new_id(),
            slug="dallas",
            name="Dallas",
            state="TX",
            center_lat=32.77,
            center_lng=-96.79,
            zoom=11,
        )
        session.add(m)
        session.commit()
        market_id = m.id
    engine.dispose()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": ADMIN_PASSWORD},
        )
        assert login.status_code == 200, login.text
        token = client.cookies.get("access")
        yield s, app, client, token, market_id


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_deal(client: AsyncClient, token: str, market_id: str, **over) -> dict:
    body = {
        "market_id": market_id,
        "list_price_cents": 6_990_000,
        "arv_cents": 11_000_000,
        "address1": "916 Eldridge St",
        "city": "Dallas",
        "state": "TX",
        "rehab_high_cents": 2_500_000,
        "assignment_fee_cents": 800_000,
        "lockbox_code": "4321",
        "beds": 3,
        "baths": 2,
        "sqft": 1400,
        "lat": 32.7767,
        "lng": -96.797,
        **over,
    }
    res = await client.post("/api/v1/admin/deals", headers=_auth(token), json=body)
    assert res.status_code == 200, res.text
    return res.json()


async def test_create_missing_price_422(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    res = await client.post(
        "/api/v1/admin/deals",
        headers=_auth(token),
        json={"market_id": market_id, "arv_cents": 100, "address1": "x", "city": "Dallas"},
    )
    assert res.status_code == 422


async def test_admin_json_has_desk_fields_client_does_not(admin_env, settings) -> None:
    _s, app, client, token, market_id = admin_env
    created = await _create_deal(client, token, market_id)
    deal_id = created["id"]
    files = {"file": ("a.jpg", _jpeg(), "image/jpeg")}
    up = await client.post(f"/api/v1/admin/deals/{deal_id}/photos", headers=_auth(token), files=files)
    assert up.status_code == 200, up.text
    await client.patch(
        f"/api/v1/admin/deals/{deal_id}",
        headers=_auth(token),
        json={"status": "available"},
    )
    admin_json = (await client.get(f"/api/v1/admin/deals/{deal_id}", headers=_auth(token))).json()
    assert "rehab_high_cents" in admin_json
    assert "lockbox_code" in admin_json
    assert admin_json["lockbox_code"] == "4321"
    assert isinstance(admin_json["mao_cents"], int)

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "buyer@example.com",
            "password": PASSWORD,
            "full_name": "B",
            "terms_version": "2026-08-22",
        },
    )
    # approve
    buyers = await client.get("/api/v1/admin/buyers", headers=_auth(token))
    bid = next(b["id"] for b in buyers.json() if b["email"] == "buyer@example.com")
    await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=_auth(token), json={})
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    buyer_token = client.cookies.get("access")
    pub = await client.get(f"/api/v1/deals/{deal_id}", headers=_auth(buyer_token))
    assert pub.status_code == 200, pub.text
    data = pub.json()
    assert data["list_price_cents"] == 6_990_000
    assert data["arv_cents"] == 11_000_000
    assert_public_clean(data)
    for key in DENYLIST:
        assert key not in data
    pins = await client.get("/api/v1/map/pins", headers=_auth(buyer_token))
    assert pins.status_code == 200
    assert_public_clean(pins.json())
    listing = await client.get("/api/v1/deals", headers=_auth(buyer_token))
    assert listing.status_code == 200
    assert_public_clean(listing.json())


async def test_pending_forbidden(admin_env) -> None:
    _s, _app, client, token, _mid = admin_env
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pend@example.com",
            "password": PASSWORD,
            "full_name": "P",
            "terms_version": "2026-08-22",
        },
    )
    await client.post("/api/v1/auth/login", json={"email": "pend@example.com", "password": PASSWORD})
    res = await client.get("/api/v1/deals")
    assert res.status_code == 403


async def test_client_cannot_create(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "c@example.com",
            "password": PASSWORD,
            "full_name": "C",
            "terms_version": "2026-08-22",
        },
    )
    buyers = await client.get("/api/v1/admin/buyers", headers=_auth(token))
    bid = next(b["id"] for b in buyers.json() if b["email"] == "c@example.com")
    await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=_auth(token), json={})
    await client.post("/api/v1/auth/login", json={"email": "c@example.com", "password": PASSWORD})
    bt = client.cookies.get("access")
    res = await client.post(
        "/api/v1/admin/deals",
        headers=_auth(bt),
        json={
            "market_id": market_id,
            "list_price_cents": 100,
            "arv_cents": 200,
            "address1": "x",
            "city": "Dallas",
        },
    )
    assert res.status_code == 403


async def test_publish_without_photo_and_price_history(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    created = await _create_deal(client, token, market_id)
    deal_id = created["id"]
    bad = await client.patch(
        f"/api/v1/admin/deals/{deal_id}",
        headers=_auth(token),
        json={"status": "available"},
    )
    assert bad.status_code == 422
    files = {"file": ("a.jpg", _jpeg(), "image/jpeg")}
    assert (
        await client.post(f"/api/v1/admin/deals/{deal_id}/photos", headers=_auth(token), files=files)
    ).status_code == 200
    ok = await client.patch(
        f"/api/v1/admin/deals/{deal_id}",
        headers=_auth(token),
        json={"status": "available"},
    )
    assert ok.status_code == 200
    hist = await client.patch(
        f"/api/v1/admin/deals/{deal_id}",
        headers=_auth(token),
        json={"list_price_cents": 6_490_000},
    )
    assert hist.status_code == 200
    assert hist.json()["reduced_cents"] == 500_000


async def test_photo_rejects_php(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    created = await _create_deal(client, token, market_id)
    res = await client.post(
        f"/api/v1/admin/deals/{created['id']}/photos",
        headers=_auth(token),
        files={"file": ("x.jpg", b"<?php echo 1;", "image/jpeg")},
    )
    assert res.status_code == 422


async def test_soft_delete_hidden(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    created = await _create_deal(client, token, market_id, status="coming_soon")
    deal_id = created["id"]
    await client.delete(f"/api/v1/admin/deals/{deal_id}", headers=_auth(token))
    listed = await client.get("/api/v1/admin/deals", headers=_auth(token))
    assert all(d["id"] != deal_id for d in listed.json())
    trash = await client.get("/api/v1/admin/deals?deleted=true", headers=_auth(token))
    assert any(d["id"] == deal_id for d in trash.json())


async def test_coming_soon_hidden_from_client(admin_env) -> None:
    _s, _app, client, token, market_id = admin_env
    await _create_deal(client, token, market_id, status="coming_soon")
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "see@example.com",
            "password": PASSWORD,
            "full_name": "S",
            "terms_version": "2026-08-22",
        },
    )
    buyers = await client.get("/api/v1/admin/buyers", headers=_auth(token))
    bid = next(b["id"] for b in buyers.json() if b["email"] == "see@example.com")
    await client.post(f"/api/v1/admin/buyers/{bid}/approve", headers=_auth(token), json={})
    await client.post("/api/v1/auth/login", json={"email": "see@example.com", "password": PASSWORD})
    listing = await client.get("/api/v1/deals")
    assert listing.json() == []


async def test_document_download_and_media_auth(admin_env) -> None:
    _s, app, client, token, market_id = admin_env
    created = await _create_deal(client, token, market_id)
    deal_id = created["id"]
    await client.post(
        f"/api/v1/admin/deals/{deal_id}/photos",
        headers=_auth(token),
        files={"file": ("a.jpg", _jpeg(), "image/jpeg")},
    )
    await client.patch(
        f"/api/v1/admin/deals/{deal_id}",
        headers=_auth(token),
        json={"status": "available"},
    )
    doc = await client.post(
        f"/api/v1/admin/deals/{deal_id}/documents",
        headers=_auth(token),
        files={"file": ("p.pdf", _pdf(), "application/pdf")},
    )
    assert doc.status_code == 200, doc.text
    anon = await client.get(f"/api/v1/documents/{doc.json()['id']}/download")
    # still admin cookies
    dl = await client.get(f"/api/v1/documents/{doc.json()['id']}/download", headers=_auth(token))
    assert dl.status_code == 200
    media = await client.get("/api/v1/internal/media-auth", headers=_auth(token))
    assert media.status_code == 200
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as naked:
        no = await naked.get("/api/v1/internal/media-auth")
        assert no.status_code == 401
    _ = anon
