# Deploy (brother)

Images come from GHCR. The box never builds.

## First boot

1. Install Docker Engine + Compose plugin.
2. `docker login ghcr.io` with a read-only personal access token (`read:packages`) if packages are private.
3. Copy `.env.example` → `.env`. Required: `SECRET_KEY` (≥ 32 bytes), `PUBLIC_BRAND_NAME`, `PUBLIC_DOMAIN`, `CORS_ORIGINS`, `IMAGE_TAG`, `ENVIRONMENT=prod`, a PostgreSQL `DATABASE_URL`.
4. Mail can stay blank. Set `PUBLIC_MAILING_ADDRESS` before any blast.
5. `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull`
6. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
7. Wait for `/healthz` (`{"status":"ok",…}`) within ~60s.
8. Confirm `/api/v1/public/config` matches brand env and `/version` matches `IMAGE_TAG`.

TLS: put Caddy or nginx+certbot in front. `infra/nginx/nginx.conf` is a starting point.

## Upgrade / rollback

- Upgrade: set `IMAGE_TAG=v1.0.0`, `pull`, `up -d`. Backend runs Alembic on boot.
- Rollback: set `IMAGE_TAG` to the previous tag, `pull`, `up -d`. If a migration is incompatible, `alembic downgrade` per the release notes, then roll the image.

## Ops

- Nightly backup: `infra/backup/backup.sh` (pg_dump + object store). Restore: `docs/runbooks/backup-restore.md`.
- Rotate `SECRET_KEY`: put the old value in `SECRET_KEY_PREVIOUS`, deploy, then blank `SECRET_KEY_PREVIOUS` after sessions drain (`docs/runbooks/env.md`).
- Extra admin: `python -m app.cli create-admin --email brother@… --password …` inside the backend container.
- Disk full: prune Docker, rotate `json-file` logs (already capped in the prod overlay).

Until GHCR tags exist, the builder runs Python + Node on the laptop (see README).
