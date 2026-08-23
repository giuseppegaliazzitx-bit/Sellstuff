# API (Phase 0)

Unauthenticated.

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | 200 if the database pings; 503 otherwise. Body includes `db` and `redis` (`ok` / `skipped` / `down`). |
| GET | `/version` | `{ "version", "commit", "environment" }` from build/env. |
| GET | `/api/v1/public/config` | Public brand knobs + `terms_version`. Safe to expose. |
| POST | `/api/v1/auth/register` | Open register. No invite. Starts `pending` unless `REQUIRE_ADMIN_APPROVAL=false`. |
| POST | `/api/v1/auth/login` | Sets HttpOnly access + refresh cookies and a readable `csrf` cookie. |
| POST | `/api/v1/auth/refresh` | Rotate refresh (reuse of an old refresh revokes the family). |
| POST | `/api/v1/auth/logout` | Revoke family, clear cookies. CSRF or Bearer. |
| GET | `/api/v1/auth/me` | Current user. 401 if anonymous. |
| GET | `/api/v1/deals` | Empty list until Phase 2. 403 if pending. |
| GET | `/api/v1/admin/buyers` | Admin only. |
| POST | `/api/v1/admin/buyers/{id}/approve` | Bumps `token_version`. |

OpenAPI: `GET /openapi.json` (FastAPI default).
Frontend types in `frontend/src/shared/api/types.ts` are generated from that document (`scripts/gen_openapi.py`).
