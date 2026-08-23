# Environment variables

Every knob lives in `.env`. `.env.example` is the committed catalog.
**What each variable is for:** [env-variables.md](env-variables.md).
CI fails if a `Settings` field is added without a matching `.env.example` key (P0-T13).

## Local-first defaults

| Variable | Local (no Docker) | Compose later |
|---|---|---|
| `ENVIRONMENT` | `local` | `prod` |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/northstar.db` | `postgresql+psycopg://northstar:northstar@postgres:5432/northstar` |
| `REDIS_URL` | empty (in-process memory) | `redis://redis:6379/0` |
| `S3_ENDPOINT` | empty (filesystem under `LOCAL_MEDIA_DIR`) | `http://minio:9000` |
| `COOKIE_NAME_PREFIX` | empty (plain HTTP) | `__Host-` |
| `COOKIE_SECURE` | `false` | `true` |
| `MAIL_*` | empty (sandbox `.eml`) | Gmail app password |

`ENVIRONMENT=prod` **refuses** a SQLite `DATABASE_URL`.

## Secrets

- `SECRET_KEY` — required, ≥ 32 bytes. Signs every JWT. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `SECRET_KEY_PREVIOUS` — verify-only during rotation.

### Rotate `SECRET_KEY`

1. Generate a new 32+ byte key.
2. Move the current `SECRET_KEY` into `SECRET_KEY_PREVIOUS`.
3. Set `SECRET_KEY` to the new value and restart.
4. New access tokens sign with the new key; old ones still verify via previous.
5. After refresh tokens rotate (or you bump `token_version`), blank `SECRET_KEY_PREVIOUS` and restart. Old access tokens then 401.
- `MAIL_PASSWORD` — 16-char Google App Password. Blank is fine until Phase 6.
- `BOOTSTRAP_ADMIN_PASSWORD` — used in Phase 1 seed. Blank in Phase 0.

Never commit `.env`.
