from __future__ import annotations

from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import GeocodeCache, new_id


async def geocode_address(
    session: AsyncSession,
    settings: Settings,
    query: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> tuple[float, float] | None:
    q = " ".join(query.lower().split())
    if not q:
        return None
    cached = (await session.execute(select(GeocodeCache).where(GeocodeCache.query == q))).scalar_one_or_none()
    if cached:
        return cached.lat, cached.lng
    headers = {"User-Agent": settings.nominatim_user_agent}
    url = settings.nominatim_url.rstrip("/") + "/search"
    own = client is None
    http = client or httpx.AsyncClient(timeout=10.0, headers=headers)
    try:
        res = await http.get(url, params={"q": query, "format": "json", "limit": 1})
        res.raise_for_status()
        data = res.json()
    finally:
        if own:
            await http.aclose()
    if not data:
        return None
    lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
    session.add(GeocodeCache(id=new_id(), query=q, lat=lat, lng=lng, at=datetime.now(UTC)))
    await session.commit()
    return lat, lng
