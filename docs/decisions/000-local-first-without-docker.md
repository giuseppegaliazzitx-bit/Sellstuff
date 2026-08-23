# 000 — Local-first runtime (Docker later)

**Status:** accepted (2026-08-22)
**Phase:** 0
**Supersedes:** DESIGN.md §7 “Docker is how it runs” *as a day-one requirement only*

## Context

Docker Engine is not installed on the builder’s Windows machine. GitHub is ready. The product still needs Compose/Dockerfiles for the brother’s eventual handoff (Phase 12).

DESIGN.md also assumes Postgres 16, Redis 7, and MinIO as always-on services. None of those are installed locally.

## Decision

1. **Ship the Docker files now** (`Dockerfile`s, `docker-compose.yml`, `docker-compose.prod.yml`, nginx) so Phase 12 is not a rewrite. They are not required to run or test on the builder’s laptop.
2. **Local default store is SQLite** (`sqlite+aiosqlite:///./data/northstar.db`). Alembic migrations must be dialect-safe: Postgres extensions (`citext`, `pg_trgm`) run only on Postgres; SQLite uses ordinary unique indexes / `LIKE`.
3. **Redis is optional.** Empty `REDIS_URL` → in-process memory for rate limits / `token_version` cache. `/healthz` reports `redis: skipped` and still returns 200 if the database pings.
4. **Object storage is optional.** Empty `S3_ENDPOINT` → `LOCAL_MEDIA_DIR` on disk.
5. **`ENVIRONMENT=prod` refuses SQLite.** Production is Postgres. The fallback is a laptop convenience, not a second product.
6. **CI on GitHub** runs native pytest + vitest (no local Docker). Compose-based e2e waits until Docker is available; the workflow files exist and are skipped with `if` until then.
7. **Python 3.11 is accepted locally** (what is installed). Dockerfiles pin **3.12** as designed.

## Consequences

- `citext` / `pg_trgm` are not available on the laptop. Email uniqueness is `UNIQUE` on a lowercased column or a functional unique index when Postgres is in use.
- `/healthz` 503 is tied to the **database**, not Redis.
- Switching to Compose later is an env change, not a code change: point `DATABASE_URL` / `REDIS_URL` / `S3_ENDPOINT` at the Compose hostnames.
