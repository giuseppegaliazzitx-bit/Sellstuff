"""Phase 1 API tests."""

from __future__ import annotations

from datetime import timedelta

import jwt
import pytest
from app.core.security import decode_jwt, encode_jwt
from app.main import create_app
from httpx import ASGITransport, AsyncClient

PASSWORD = "correct-horse-battery"
ADMIN_PASSWORD = "correct-horse-admin1"
TERMS = "2026-08-22"


def _register_body(**overrides: object) -> dict:
    body: dict = {
        "email": "buyer@example.com",
        "password": PASSWORD,
        "full_name": "Buyer One",
        "phone": "555-0100",
        "terms_version": TERMS,
        "sms_consent": False,
        "lead_source": "website",
        "markets": ["Dallas"],
        "asset_types": ["SFR"],
    }
    body.update(overrides)
    return body


def _csrf(client: AsyncClient) -> dict[str, str]:
    token = client.cookies.get("csrf") or ""
    return {"X-CSRF-Token": token, "Origin": "http://localhost:5173"}


@pytest.fixture
async def app_client(settings):
    app = create_app(settings)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield app, ac


async def test_register_pending_without_invite(app_client) -> None:
    """P1-T2."""
    _app, client = app_client
    res = await client.post("/api/v1/auth/register", json=_register_body())
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "pending"
    assert body["role"] == "client"
    assert body["terms_accepted"] is True


async def test_register_active_when_approval_off(settings) -> None:
    """P1-T3."""
    s = settings.model_copy(update={"require_admin_approval": False})
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/register", json=_register_body())
    assert res.status_code == 200
    assert res.json()["status"] == "active"


async def test_pending_cannot_list_deals(app_client) -> None:
    """P1-T4."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    login = await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    assert login.status_code == 200
    res = await client.get("/api/v1/deals")
    assert res.status_code == 403


async def test_login_bad_password_same_as_unknown(app_client) -> None:
    """P1-T5."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    bad = await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": "nope-nope-nope"})
    unknown = await client.post(
        "/api/v1/auth/login", json={"email": "nobody@example.com", "password": "nope-nope-nope"}
    )
    assert bad.status_code == 401
    assert unknown.status_code == 401
    assert bad.json()["code"] == unknown.json()["code"] == "invalid_credentials"


async def test_refresh_rotation_and_reuse(app_client) -> None:
    """P1-T6, P1-T18."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    old_refresh = client.cookies.get("refresh")
    first = await client.post("/api/v1/auth/refresh", headers=_csrf(client))
    assert first.status_code == 200, first.text
    new_refresh = client.cookies.get("refresh")
    assert new_refresh != old_refresh
    # old refresh is now used
    reuse = await client.post(
        "/api/v1/auth/refresh",
        headers=_csrf(client),
        cookies={"refresh": old_refresh},
    )
    assert reuse.status_code == 401
    # child is revoked too
    child = await client.post(
        "/api/v1/auth/refresh",
        headers=_csrf(client),
        cookies={"refresh": new_refresh},
    )
    assert child.status_code == 401


async def test_logout_kills_refresh_family(app_client) -> None:
    """P1-T7."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    res = await client.post("/api/v1/auth/logout", headers=_csrf(client))
    assert res.status_code == 200
    refresh = await client.post("/api/v1/auth/refresh", headers=_csrf(client))
    assert refresh.status_code == 401


async def test_me_unauthenticated(app_client) -> None:
    """P1-T10."""
    _app, client = app_client
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


async def test_login_sets_httponly_access_cookie(app_client) -> None:
    """P1-T15."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    res = await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    assert res.status_code == 200
    raw = ", ".join(res.headers.get_list("set-cookie"))
    assert "access=" in raw
    assert "HttpOnly" in raw
    assert "csrf=" in raw


async def test_access_jwt_claims(app_client, settings) -> None:
    """P1-T16."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    token = client.cookies.get("access")
    claims = decode_jwt(settings, token, expected_typ="access")
    for key in ("sub", "sid", "jti", "typ", "role", "status", "ver", "iss", "aud"):
        assert key in claims
    assert claims["typ"] == "access"
    assert int(claims["exp"]) - int(claims["iat"]) == settings.access_token_ttl_minutes * 60


async def test_tampered_and_wrong_typ(app_client, settings) -> None:
    """P1-T17."""
    _app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    access = client.cookies.get("access")
    tampered = access[:-4] + ("AAAA" if not access.endswith("AAAA") else "BBBB")
    bad = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"})
    assert bad.status_code == 401
    assert bad.json()["code"] in {"token_invalid", "token_expired"}

    none_token = jwt.encode(
        {
            "sub": "x",
            "typ": "access",
            "jti": "j",
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "iat": 1_787_000_000,
            "exp": 1_787_090_000,
        },
        key=None,
        algorithm="none",
    )
    none_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {none_token}"})
    assert none_res.status_code == 401

    user_id = (await client.get("/api/v1/auth/me")).json()["id"]
    reset = encode_jwt(settings, sub=user_id, typ="reset", ttl=timedelta(minutes=30))
    reset_as_access = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {reset}"})
    assert reset_as_access.status_code == 401


async def test_login_and_register_rate_limit(app_client) -> None:
    """P1-T11, P1-T12."""
    _app, client = app_client
    last = None
    for i in range(12):
        last = await client.post(
            "/api/v1/auth/login",
            json={"email": f"r{i}@example.com", "password": "nope-nope-nope"},
        )
    assert last is not None
    assert last.status_code == 429

    last_reg = None
    for i in range(6):
        last_reg = await client.post(
            "/api/v1/auth/register",
            json=_register_body(email=f"new{i}@example.com"),
        )
    assert last_reg is not None
    assert last_reg.status_code == 429


async def test_register_requires_terms_version(app_client, settings) -> None:
    """P1-T23."""
    _app, client = app_client
    body = _register_body()
    body.pop("terms_version")
    res = await client.post("/api/v1/auth/register", json=body)
    assert res.status_code == 422
    ok = await client.post("/api/v1/auth/register", json=_register_body())
    assert ok.status_code == 200
    assert ok.json()["terms_accepted"] is True
    # bump terms
    settings.terms_version = "2026-09-01"
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    app_me = await client.get("/api/v1/auth/me")
    assert app_me.status_code == 200
    assert app_me.json()["terms_accepted"] is False


@pytest.fixture
async def admin_app(settings):
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield s, app, ac


async def _admin_bearer(client: AsyncClient) -> str:
    res = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
    assert res.status_code == 200, res.text
    return client.cookies.get("access")


async def test_non_admin_cannot_approve(admin_app) -> None:
    """P1-T8."""
    _s, _app, client = admin_app
    await client.post("/api/v1/auth/register", json=_register_body())
    buyer_id = (
        await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    ).json()["id"]
    access = client.cookies.get("access")
    res = await client.post(
        f"/api/v1/admin/buyers/{buyer_id}/approve",
        headers={"Authorization": f"Bearer {access}"},
        json={},
    )
    assert res.status_code == 403


async def test_admin_approve_and_deals(admin_app) -> None:
    """P1-T9, P1-T20."""
    _s, app, client = admin_app
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
    buyer_access = client.cookies.get("access")
    buyer_id = (await client.get("/api/v1/auth/me")).json()["id"]

    admin_token = await _admin_bearer(client)
    # approving with admin bearer; cookies may still be admin's after _admin_bearer
    res = await client.post(
        f"/api/v1/admin/buyers/{buyer_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "active"

    stale = await client.get("/api/v1/deals", headers={"Authorization": f"Bearer {buyer_access}"})
    assert stale.status_code == 401
    assert stale.json()["code"] == "token_stale"

    # restore buyer cookies for refresh: log buyer back in? family still valid until ver bump
    # ver bump does not revoke refresh families — refresh issues new access with new ver
    # but we overwrote cookies with admin login. Use a second client.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as buyer:
        await buyer.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
        refreshed = await buyer.post("/api/v1/auth/refresh", headers=_csrf(buyer))
        assert refreshed.status_code == 200
        assert refreshed.json()["status"] == "active"
        deals = await buyer.get("/api/v1/deals")
        assert deals.status_code == 200
        assert deals.json() == []


async def test_suspend_stales_access(admin_app) -> None:
    """P1-T19."""
    _s, _app, client = admin_app
    await client.post("/api/v1/auth/register", json=_register_body(email="keep@example.com"))
    await client.post("/api/v1/auth/login", json={"email": "keep@example.com", "password": PASSWORD})
    buyer_access = client.cookies.get("access")
    buyer_id = (await client.get("/api/v1/auth/me")).json()["id"]
    admin_token = await _admin_bearer(client)
    # first approve so they're a real client
    await client.post(
        f"/api/v1/admin/buyers/{buyer_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    # login again as buyer to get a post-approve access token
    await client.post("/api/v1/auth/login", json={"email": "keep@example.com", "password": PASSWORD})
    live_access = client.cookies.get("access")
    buyer_id = (await client.get("/api/v1/auth/me")).json()["id"]
    admin_token = await _admin_bearer(client)
    sus = await client.post(
        f"/api/v1/admin/buyers/{buyer_id}/suspend",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert sus.status_code == 200
    nxt = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {live_access}"})
    assert nxt.status_code == 401
    assert nxt.json()["code"] == "token_stale"
    _ = buyer_access


async def test_csrf_required_cookie_post_bearer_ok(admin_app) -> None:
    """P1-T21."""
    _s, _app, client = admin_app
    await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": ADMIN_PASSWORD})
    no_csrf = await client.post("/api/v1/auth/logout")
    assert no_csrf.status_code == 403
    assert no_csrf.json()["code"] == "csrf_failed"
    access = client.cookies.get("access")
    with_bearer = await client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {access}"})
    assert with_bearer.status_code == 200


async def test_two_sessions_revoke_one(admin_app) -> None:
    """P1-T22."""
    s, app, client = admin_app
    await client.post("/api/v1/auth/register", json=_register_body())
    transport = ASGITransport(app=app)
    async with (
        AsyncClient(transport=transport, base_url="http://test") as a,
        AsyncClient(transport=transport, base_url="http://test") as b,
    ):
        await a.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
        await b.post("/api/v1/auth/login", json={"email": "buyer@example.com", "password": PASSWORD})
        sessions = await a.get("/api/v1/auth/sessions")
        assert sessions.status_code == 200
        rows = sessions.json()
        assert len(rows) == 2
        other = next(r for r in rows if not r["current"])
        deleted = await a.delete(f"/api/v1/auth/sessions/{other['id']}", headers=_csrf(a))
        assert deleted.status_code == 200
        still = await a.get("/api/v1/auth/me")
        assert still.status_code == 200
        dead = await b.post("/api/v1/auth/refresh", headers=_csrf(b))
        assert dead.status_code == 401
    _ = s


async def test_verify_email_gate(settings) -> None:
    """P1-T25."""
    # mail blank: unverified badge, approve still allowed
    s = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "mail_username": "",
            "mail_password": "",
        }
    )
    app = create_app(s)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/v1/auth/register", json=_register_body())
        admin = await _admin_bearer(client)
        buyers = await client.get("/api/v1/admin/buyers", headers={"Authorization": f"Bearer {admin}"})
        row = next(b for b in buyers.json() if b["email"] == "buyer@example.com")
        assert row["email_verified"] is False
        ok = await client.post(
            f"/api/v1/admin/buyers/{row['id']}/approve",
            headers={"Authorization": f"Bearer {admin}"},
            json={},
        )
        assert ok.status_code == 200

    s2 = settings.model_copy(
        update={
            "bootstrap_admin_email": "admin@example.com",
            "bootstrap_admin_password": ADMIN_PASSWORD,
            "mail_username": "shop@gmail.com",
            "mail_password": "abcd efgh ijkl mnop",
            "require_email_verification": "auto",
        }
    )
    app2 = create_app(s2)
    transport2 = ASGITransport(app=app2)
    async with AsyncClient(transport=transport2, base_url="http://test") as client:
        await client.post("/api/v1/auth/register", json=_register_body(email="gated@example.com"))
        token = next(m["token"] for m in app2.state.mail_outbox if m["typ"] == "verify_email")
        admin = await _admin_bearer(client)
        buyers = await client.get("/api/v1/admin/buyers", headers={"Authorization": f"Bearer {admin}"})
        row = next(b for b in buyers.json() if b["email"] == "gated@example.com")
        refused = await client.post(
            f"/api/v1/admin/buyers/{row['id']}/approve",
            headers={"Authorization": f"Bearer {admin}"},
            json={},
        )
        assert refused.status_code == 409
        assert refused.json()["code"] == "email_unverified"
        verify = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert verify.status_code == 200
        again = await client.post("/api/v1/auth/verify-email", json={"token": token})
        assert again.status_code == 401
        allowed = await client.post(
            f"/api/v1/admin/buyers/{row['id']}/approve",
            headers={"Authorization": f"Bearer {admin}"},
            json={},
        )
        assert allowed.status_code == 200


async def test_password_reset_bumps_ver(app_client) -> None:
    """P1-T26."""
    app, client = app_client
    await client.post("/api/v1/auth/register", json=_register_body())
    await client.post("/api/v1/auth/forgot", json={"email": "buyer@example.com"})
    await client.post("/api/v1/auth/forgot", json={"email": "buyer@example.com"})
    tokens = [m["token"] for m in app.state.mail_outbox if m["typ"] == "reset"]
    assert len(tokens) == 2
    first = await client.post("/api/v1/auth/reset", json={"token": tokens[0], "password": "new-correct-horse"})
    assert first.status_code == 200
    second = await client.post("/api/v1/auth/reset", json={"token": tokens[1], "password": "other-correct-horse"})
    assert second.status_code == 401
    login = await client.post(
        "/api/v1/auth/login", json={"email": "buyer@example.com", "password": "new-correct-horse"}
    )
    assert login.status_code == 200
