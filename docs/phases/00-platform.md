# Phase 00 — Platform skeleton

**Branch:** `phase/00-platform`
**Goal:** Native `python` + `npm` boot yields a green `/healthz`, empty SPA shell with brand from env, Alembic current, tests green without Docker. Compose/Dockerfiles exist for later.

## Test matrix

| ID | Type | Case | File |
|---|---|---|---|
| P0-T1 | compose | `docker compose config` is valid | `infra` workflow (skipped until Docker) |
| P0-T2 | integration | `/healthz` 200 only if DB ping works | `backend/tests/test_health.py` |
| P0-T3 | integration | `/healthz` 503 if `DATABASE_URL` is wrong | `backend/tests/test_health.py` |
| P0-T4 | unit | settings refuse missing `SECRET_KEY`; refuse under 32 bytes | `backend/tests/test_settings.py` |
| P0-T5 | unit | settings boot with `MAIL_PASSWORD` empty | `backend/tests/test_settings.py` |
| P0-T6 | api | `/public/config` returns `PUBLIC_BRAND_NAME`; env change updates JSON | `backend/tests/test_public_config.py` |
| P0-T7 | smoke | frontend build produces `index.html` | `frontend` `npm run build` |
| P0-T8 | integration | `alembic upgrade head` is idempotent | `backend/tests/test_migrations.py` |
| P0-T9 | integration | Redis `PING` from backend (skipped when `REDIS_URL` empty) | `backend/tests/test_health.py` |
| P0-T10 | ci | failing unit test shows a red check | `.github/workflows/ci.yml` |
| P0-T11 | ci | gitleaks / denylist of secrets | `.pre-commit-config.yaml` + `infra` denylist |
| P0-T12 | ci | tag publishes GHCR images | `.github/workflows/release.yml` (Docker later) |
| P0-T13 | ci | `.env.example` ↔ `Settings` sync | `backend/tests/test_env_sync.py` |
| P0-T14 | unit | `core/security.py` rejects `alg=none`, wrong `typ`, wrong key | `backend/tests/test_security.py` |

## Demo script

1. Copy `.env.example` → `.env`, generate `SECRET_KEY`.
2. `python -m venv .venv` and install backend deps; `cd frontend && npm install`.
3. `alembic upgrade head` from `backend/`.
4. Run API (`uvicorn`) and Vite. Browser shows placeholder brand and “Log in”.
5. Change `PUBLIC_BRAND_NAME`, restart API, header/login title updates.
6. `pytest` and `npm run build` are green.

## Green-run record

- 2026-08-23: `pytest` 18 passed (SQLite, no Redis). `vitest` 2 passed. `npm run build` produced `frontend/dist/index.html`. `GET /healthz` → `{"status":"ok","db":"ok","redis":"skipped"}`. `GET /api/v1/public/config` returns `PUBLIC_BRAND_NAME`. `alembic upgrade head` idempotent. `python scripts/backup.py --dry-run` ok. Docker not run (not installed).
