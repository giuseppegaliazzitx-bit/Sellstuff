# Phase 12 — Production Compose handoff

**Not runnable on this laptop** until Docker Desktop + GHCR images exist. Files are in the tree.

## Brother checklist

1. Read `README.md` + `docs/runbooks/deploy.md` + `docs/runbooks/env.md` + `docs/runbooks/gmail-app-password.md`.
2. Copy `.env.example` → `.env`. Fill `SECRET_KEY` (≥32 bytes), brand, `PUBLIC_DOMAIN`, `CORS_ORIGINS`, `IMAGE_TAG`.
3. Mail may stay blank on day one. Set `PUBLIC_MAILING_ADDRESS` before the first blast.
4. `docker login ghcr.io` with a **read-only** token.
5. `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && up -d`
6. `/healthz` green. `/api/v1/public/config` shows the env brand.
7. Bootstrap admin: `BOOTSTRAP_ADMIN_*` on first boot, or `python -m app.cli create-admin --email … --password …`

Rollback = previous `IMAGE_TAG` + pull + up. Migrations: `alembic upgrade head` / documented downgrade.

TLS is his choice (Caddy or nginx+certbot). We do not provision the VPS.
