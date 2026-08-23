"""Optional Redis. Empty REDIS_URL → no client; callers treat that as 'skipped'."""

from __future__ import annotations

from redis.asyncio import Redis

from app.core.config import Settings


def make_redis(settings: Settings) -> Redis | None:
    if not settings.redis_url:
        return None
    return Redis.from_url(settings.redis_url, decode_responses=True)


async def ping_redis(client: Redis | None) -> str:
    if client is None:
        return "skipped"
    try:
        ok = await client.ping()
        return "ok" if ok else "down"
    except Exception:
        return "down"
