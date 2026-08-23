from __future__ import annotations

from datetime import timedelta

from fastapi import Response

from app.core.config import Settings

REFRESH_COOKIE_PATH = "/api/v1/auth"


def cookie_names(settings: Settings) -> dict[str, str]:
    prefix = settings.cookie_name_prefix
    if prefix == "__Host-":
        return {"access": "__Host-access", "refresh": "__Secure-refresh", "csrf": "csrf"}
    return {
        "access": f"{prefix}access" if prefix else "access",
        "refresh": f"{prefix}refresh" if prefix else "refresh",
        "csrf": "csrf",
    }


def _base_kwargs(settings: Settings) -> dict[str, object]:
    return {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
    }


def set_auth_cookies(
    response: Response,
    settings: Settings,
    *,
    access: str,
    refresh: str,
    csrf: str,
) -> None:
    names = cookie_names(settings)
    access_ttl = settings.access_token_ttl_minutes * 60
    refresh_ttl = settings.refresh_token_ttl_days * 24 * 3600
    response.set_cookie(
        names["access"],
        access,
        max_age=access_ttl,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        names["refresh"],
        refresh,
        max_age=refresh_ttl,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path=REFRESH_COOKIE_PATH,
    )
    response.set_cookie(
        names["csrf"],
        csrf,
        max_age=refresh_ttl,
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response, settings: Settings) -> None:
    names = cookie_names(settings)
    response.delete_cookie(names["access"], path="/")
    response.delete_cookie(names["refresh"], path=REFRESH_COOKIE_PATH)


def set_csrf_cookie(response: Response, settings: Settings, csrf: str) -> None:
    names = cookie_names(settings)
    response.set_cookie(
        names["csrf"],
        csrf,
        max_age=int(timedelta(days=14).total_seconds()),
        httponly=False,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
