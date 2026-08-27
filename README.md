# Northstar Dispo


 real estate marketplace (buyer portal + dispo desk).
Brand, phone, domain, and mailbox live in `.env` — never in code.

**Local-first:** this repo runs on Windows with Python + Node. Docker/Compose files are in the tree for later (Phase 12 handoff). You do not need Docker, Postgres, Redis, or MinIO to develop Phase 0–n on this machine.

## Prerequisites

- Python 3.11+ (3.12 in the Dockerfiles when you containerize)
- Node.js 20+
- Git

Optional later: Docker Engine + Compose, PostgreSQL 16, Redis 7.

## Quick start (Windows / Git Bash)

```bash
# 1. Env
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
# paste the printed value into SECRET_KEY in .env

# 2. Backend
python -m venv .venv
source .venv/Scripts/activate          # Git Bash
# .\.venv\Scripts\Activate.ps1         # PowerShell
python -m pip install -U pip
python -m pip install -e ".[dev]" --chdir backend
cd backend
alembic upgrade head
cd ..

# 3. Frontend
cd frontend
npm install
cd ..

# 4. Run both (two terminals, or the helper)
python scripts/run_dev.py
```

- SPA: http://127.0.0.1:5173
- API: http://127.0.0.1:8000
- Health: http://127.0.0.1:8000/healthz
- Brand JSON: http://127.0.0.1:8000/api/v1/public/config

Change `PUBLIC_BRAND_NAME` in `.env`, restart the API, refresh the browser. No frontend rebuild.

What each env var does: [docs/runbooks/env-variables.md](docs/runbooks/env-variables.md).

### Demo accounts (Phase 1)

Set in `.env` (12+ character password, not a common word):

```
BOOTSTRAP_ADMIN_EMAIL=admin@localhost
BOOTSTRAP_ADMIN_PASSWORD=correct-horse-admin1
```

Restart the API. Log in as that admin. A demo buyer is also seeded (`buyer@localhost` / `correct-horse-buyer1`). Or **Settings → View site as a buyer** while logged in as admin.

On first API boot (not under pytest) the Dallas market and 8 sample houses are seeded. Browse the map as the approved buyer. Admin **Inventory** shows rehab and the contract clock; the buyer deal page shows list price + ARV only.

## Tests

```bash
source .venv/Scripts/activate
python -m pytest backend/tests -q
cd frontend && npm test && npm run build
```

## Docker (later — not required now)

When Docker Desktop is installed:

```bash
cp .env.example .env   # fill SECRET_KEY
docker compose up --build
```

Prod overlay (brother, Phase 12) pulls tagged images from GHCR — see `docs/runbooks/deploy.md`. Extra admin: `python -m app.cli create-admin --email … --password …` from `backend/`.

## Layout

```
backend/     FastAPI + Alembic
frontend/    Vite + React + TypeScript
infra/       nginx, postgres init, backup script
docs/        phases, decisions, runbooks
DESIGN.md    product & engineering source of truth
```

## Git

Do not commit to `main`. Phase branches, checkpoint commits, PR + CI — see `CONTRIBUTING.md`.
