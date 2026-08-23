# Deploy (brother) — draft, Phase 12 fills this in

This is a placeholder so the file exists in Phase 0. Do not run this yet; images are not published.

When Docker is available and a `phase-00` / `v0.0.0` tag has built images:

1. Install Docker Engine + Compose plugin.
2. `docker login ghcr.io` with a read-only token if packages are private.
3. Copy `.env.example` → `.env`. Fill `SECRET_KEY`, brand, `PUBLIC_DOMAIN`, `CORS_ORIGINS`, `IMAGE_TAG`.
4. `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
5. Point DNS; TLS is your choice (Caddy on the host, or nginx+certbot).
6. Rollback = previous `IMAGE_TAG` + `pull` + `up -d`.

Until then, the builder runs Python + Node on the laptop (see README).
