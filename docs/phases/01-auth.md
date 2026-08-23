# Phase 01 — Auth, roles, open register, approval gate

**Branch:** `phase/01-auth`
**Goal:** Anyone can register. Nobody sees inventory until approved. Admin can approve.

## Test matrix

| ID | Type | File |
|---|---|---|
| P1-T1 | unit | `backend/tests/test_passwords.py` |
| P1-T2 | api | `backend/tests/test_auth_api.py` |
| P1-T3 | api | `backend/tests/test_auth_api.py` |
| P1-T4 | api | `backend/tests/test_auth_api.py` |
| P1-T5 | api | `backend/tests/test_auth_api.py` |
| P1-T6 | api | `backend/tests/test_auth_api.py` |
| P1-T7 | api | `backend/tests/test_auth_api.py` |
| P1-T8 | api | `backend/tests/test_auth_api.py` |
| P1-T9 | api | `backend/tests/test_auth_api.py` |
| P1-T10 | api | `backend/tests/test_auth_api.py` |
| P1-T11 | api | `backend/tests/test_auth_api.py` |
| P1-T12 | api | `backend/tests/test_auth_api.py` |
| P1-T13 | component | `frontend/src/features/auth/WaitingRoom.test.tsx` |
| P1-T14 | component | `frontend/src/app/guards.test.tsx` |
| P1-T15 | api | Set-Cookie HttpOnly on login (`test_auth_api.py`) |
| P1-T16 | unit | `backend/tests/test_security.py` |
| P1-T17 | api | `backend/tests/test_auth_api.py` |
| P1-T18 | api | `backend/tests/test_auth_api.py` |
| P1-T19 | api | `backend/tests/test_auth_api.py` |
| P1-T20 | api | `backend/tests/test_auth_api.py` |
| P1-T21 | api | `backend/tests/test_auth_api.py` |
| P1-T22 | api | `backend/tests/test_auth_api.py` |
| P1-T23 | api | `backend/tests/test_auth_api.py` |
| P1-T24 | unit | `backend/tests/test_security.py` (P0, still green) |
| P1-T25 | api | `backend/tests/test_auth_api.py` |
| P1-T26 | api | `backend/tests/test_auth_api.py` |
| P1-T27 | component | `frontend/src/shared/api/client.test.ts` |

## Demo script

1. `alembic upgrade head` then `python scripts/run_dev.py`.
2. Open the SPA. Register (no invite). Accept terms. Land on waiting room.
3. Log in as bootstrap admin. Buyers → Pending → Approve.
4. Client refresh / next navigation lands on empty Browse.
5. Admin suspends the buyer; their next click is `/login`.

## Green-run record

- 2026-08-23: backend `pytest` 39 passed. frontend vitest 6 passed, `npm run build` green. Local-first SQLite. Docker not required.
