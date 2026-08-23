"""Tiny key-value with TTL. Redis when configured, process memory otherwise."""

from __future__ import annotations

import time
from typing import Protocol

from redis.asyncio import Redis


class KV(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def setex(self, key: str, ttl_seconds: int, value: str) -> None: ...
    async def delete(self, key: str) -> None: ...


class MemoryKV:
    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float | None]] = {}

    def _purge(self, key: str) -> None:
        item = self._data.get(key)
        if item and item[1] is not None and item[1] < time.monotonic():
            self._data.pop(key, None)

    async def get(self, key: str) -> str | None:
        self._purge(key)
        item = self._data.get(key)
        return item[0] if item else None

    async def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        expiry = time.monotonic() + ttl_seconds if ttl_seconds > 0 else None
        self._data[key] = (value, expiry)

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)


class RedisKV:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def get(self, key: str) -> str | None:
        value = await self._client.get(key)
        if value is None:
            return None
        return value if isinstance(value, str) else value.decode()

    async def setex(self, key: str, ttl_seconds: int, value: str) -> None:
        await self._client.set(key, value, ex=ttl_seconds)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)


class MemoryLimiter:
    """Fixed-window counter used when Redis is absent."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        arr = [t for t in self._hits.get(key, []) if now - t < window_seconds]
        if len(arr) >= limit:
            self._hits[key] = arr
            return False
        arr.append(now)
        self._hits[key] = arr
        return True
