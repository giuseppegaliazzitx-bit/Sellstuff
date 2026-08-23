# API (Phase 0)

Unauthenticated.

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | 200 if the database pings; 503 otherwise. Body includes `db` and `redis` (`ok` / `skipped` / `down`). |
| GET | `/version` | `{ "version", "commit", "environment" }` from build/env. |
| GET | `/api/v1/public/config` | Public brand knobs. Safe to expose. Changing `.env` + restarting the API updates this without a frontend rebuild. |

OpenAPI: `GET /openapi.json` (FastAPI default).
Frontend types in `frontend/src/shared/api/types.ts` are generated from that document (`scripts/gen_openapi.py`).
