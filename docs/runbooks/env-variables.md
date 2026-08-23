# Environment variables

Every knob the app reads lives in `.env` (copied from `.env.example`). Names match `Settings` in `backend/app/core/config.py`. CI fails if a setting is added without a matching `.env.example` key.

Never commit `.env`. Restart the API after changing a value. Brand fields also show up at `GET /api/v1/public/config` — no frontend rebuild.

**Local laptop:** only `SECRET_KEY` is required. Everything else can stay at the example defaults (SQLite, sandbox mail, no Redis, no S3).

**Generate a secret:**

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## What you must set

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs JWTs (login cookies, password-reset links, blast track/unsub tokens). **Required. At least 32 bytes.** App will not boot without it. |

Recommended on first boot so you can log into the desk:

| Variable | Purpose |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` | Email of the first admin. Created on API start if that user does not exist. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password for that admin. Must pass the password rules (12+ chars, not a common word). Example: `correct-horse-admin1`. |

---

## Runtime

| Variable | Default | What it is for |
|---|---|---|
| `ENVIRONMENT` | `local` | `local`, `dev`, or `prod`. **`prod` refuses SQLite** — you must use Postgres. |
| `APP_VERSION` | `dev` | Shown at `GET /version`. In Compose this should match the image tag. |
| `APP_COMMIT` | `unknown` | Git SHA reported by `/version`. CI can stamp this at build time. |
| `LOG_LEVEL` | `info` | Structlog level (`debug`, `info`, `warning`, `error`). |
| `SENTRY_DSN` | empty | Error reporting. **Blank = Sentry off.** Optional `sentry_sdk` package; nothing is sent if this is empty. |

---

## Brand (public)

These are safe to expose. The SPA header, footer, login copy, and `/api/v1/public/config` read them.

| Variable | Default | What it is for |
|---|---|---|
| `PUBLIC_BRAND_NAME` | `Northstar Dispo` | Wordmark / page title. Change this when the real shop name is decided. |
| `PUBLIC_BRAND_TAGLINE` | empty | Subtitle on the landing and login pages. |
| `PUBLIC_DOMAIN` | `localhost` | Public hostname. Also used as JWT issuer if `JWT_ISSUER` is blank. |
| `PUBLIC_SUPPORT_PHONE` | empty | “Call” on deal pages (`tel:` link). Empty still records a contact click. |
| `PUBLIC_SUPPORT_EMAIL` | empty | Support address shown to buyers; fallback sandbox recipient. |
| `PUBLIC_LOGO_URL` | empty | Header logo. Empty = gold text wordmark. |
| `PUBLIC_FOOTER_LEGAL_NAME` | empty | Footer copyright line. Falls back to brand name. |
| `PUBLIC_PRIMARY_STATE` | `TX` | Default state for notices (Texas equitable-interest copy). |
| `PUBLIC_MAILING_ADDRESS` | empty | **CAN-SPAM footer.** Blasts **will not send** until this is set. Physical office, PO box, or registered agent. |

---

## Auth and product policy

| Variable | Default | What it is for |
|---|---|---|
| `REQUIRE_ADMIN_APPROVAL` | `false` | When `true`, new buyers wait in the waiting room until an admin Approves. When `false` (local default now), anyone who registers is `active` immediately. Imported-list emails are always `active`. |
| `REQUIRE_EMAIL_VERIFICATION` | `auto` | `true` = always require verify-email. `false` = never. `auto` = require it only when mail is configured. |
| `ADMIN_REQUIRE_2FA` | `false` | When `true`, an admin without TOTP enrolled cannot use `/admin/*` — only Settings → security. Leave false until every admin has enrolled. |
| `SECRET_KEY` | *(required)* | Current signing key. See [rotation](#rotate-secret_key). |
| `SECRET_KEY_PREVIOUS` | empty | **Verify-only** during a key rotation. Never used to sign new tokens. Blank after old sessions drain. Must be ≥32 bytes when set. |
| `JWT_ISSUER` | empty → `PUBLIC_DOMAIN` | `iss` claim on JWTs. Leave blank locally. |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | How long the HttpOnly access cookie lasts before `/auth/refresh`. |
| `REFRESH_TOKEN_TTL_DAYS` | `14` | How long a refresh-token family lasts if unused/unrevoked. |
| `COOKIE_NAME_PREFIX` | empty | Cookie name prefix. Empty locally. Use `__Host-` behind HTTPS in prod. |
| `COOKIE_SECURE` | `false` | `Secure` flag on auth cookies. Must be `true` on HTTPS. |
| `TERMS_VERSION` | `2026-08-22` | Version string buyers accept at register. If you change it, logged-in users get the “updated terms” overlay. |
| `BOOTSTRAP_ADMIN_EMAIL` | empty | Seed admin email (see above). Blank = no seed. |
| `BOOTSTRAP_ADMIN_PASSWORD` | empty | Seed admin password. |

`JWT_AUDIENCE` defaults to `northstar` in code and is not in `.env.example`. Leave it alone unless you know you need a different `aud` claim.

---

## Database, Redis, object storage

| Variable | Local default | What it is for |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/northstar.db` | SQLAlchemy URL. SQLite on this laptop. Postgres later: `postgresql+psycopg://user:pass@postgres:5432/northstar`. |
| `REDIS_URL` | empty | Rate-limit / KV cache. **Empty = in-process memory.** Fine for one API process. Compose: `redis://redis:6379/0`. |
| `S3_ENDPOINT` | empty | S3/MinIO endpoint. **Empty = files on disk** under `LOCAL_MEDIA_DIR`. |
| `S3_ACCESS_KEY` | empty | MinIO/S3 access key. Unused until `S3_ENDPOINT` is set. |
| `S3_SECRET_KEY` | empty | MinIO/S3 secret. |
| `S3_BUCKET_PHOTOS` | `photos` | Bucket (or prefix) for deal photos. |
| `S3_BUCKET_DOCS` | `docs` | Bucket (or prefix) for PDFs. |
| `LOCAL_MEDIA_DIR` | `./data/media` | Where sandbox `.eml`, photos, and PDFs live when S3 is off. |

---

## Mailbox (Gmail app password)

Leave `MAIL_USERNAME` / `MAIL_PASSWORD` blank to stay in **sandbox**: outbound writes `.eml` files, IMAP is skipped. How to mint the password: [gmail-app-password.md](gmail-app-password.md).

| Variable | Default | What it is for |
|---|---|---|
| `MAIL_FROM` | empty | From-address on outbound mail. Usually the same Gmail. |
| `MAIL_USERNAME` | empty | Full Gmail address. Together with password, flips mailbox status from sandbox → configured. |
| `MAIL_PASSWORD` | empty | 16-character **Google App Password** (not the account password). Spaces optional. |
| `MAIL_SMTP_HOST` | `smtp.gmail.com` | SMTP server. |
| `MAIL_SMTP_PORT` | `587` | SMTP port (STARTTLS). |
| `MAIL_IMAP_HOST` | `imap.gmail.com` | IMAP server for inbound. Idle/poll is a no-op until credentials are set. |
| `MAIL_IMAP_PORT` | `993` | IMAP SSL port. |
| `MAIL_POLL_SECONDS` | `60` | How often a worker would poll IMAP when Compose/worker exists. |
| `MAIL_DAILY_LIMIT` | `450` | Cap for blasts (under Gmail’s ~500/day). Used to compute “finishes Thursday.” |
| `MAIL_RATE_PER_MINUTE` | `20` | Burst cap for outbound. Also feeds the finish estimate. |

---

## Maps

No API keys. Do not point these at Google.

| Variable | Default | What it is for |
|---|---|---|
| `MAP_TILE_URL` | OSM `{s}.tile.openstreetmap.org/...` | Street map tiles in Leaflet. |
| `MAP_SAT_TILE_URL` | Esri World Imagery | Satellite toggle on browse. |
| `NOMINATIM_URL` | `https://nominatim.openstreetmap.org` | Geocoding when admin hits **Geocode** on a deal. |
| `NOMINATIM_USER_AGENT` | `NorthstarDispo/1.0 (contact: …)` | Nominatim requires a real contact string. Change the email before hitting their public API in volume. |

---

## Uploads and deal features

| Variable | Default | What it is for |
|---|---|---|
| `PHOTO_MAX_MB` | `15` | Max JPEG/PNG upload size. |
| `DOC_MAX_MB` | `25` | Max PDF upload size. |
| `WATERMARK_DOWNLOADS` | `false` | When `true`, PDF downloads are stamped with the buyer’s email. |
| `EARLY_ACCESS_DEFAULT_HOURS` | `0` | Hours after first publish that only tier-A buyers see the deal. `0` = off. Per-deal override is on the editor. |
| `VIDEO_EMBED_HOSTS` | youtube / vimeo / matterport | Hosts allowed in CSP `frame-src` and in `video_url` sanitization. Comma-separated. |

---

## Hosting

| Variable | Default | What it is for |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173`, `127.0.0.1:5173`, `http://localhost:8000` | Allowed browser origins for cookie requests. Comma-separated. Must include the SPA origin. |
| `COOKIE_SECURE` | `false` | See auth table. |
| `IMAGE_TAG` | `latest` | Which GHCR tag Compose prod pulls (`docker-compose.prod.yml`). Ignored on the laptop. |

---

## Rotate `SECRET_KEY`

1. Generate a new 32+ byte key.
2. Put the **current** `SECRET_KEY` into `SECRET_KEY_PREVIOUS`.
3. Set `SECRET_KEY` to the new value and restart.
4. New cookies sign with the new key; old access tokens still verify via previous.
5. After people refresh (or you revoke sessions), blank `SECRET_KEY_PREVIOUS` and restart. Old access tokens then 401.

---

## Typical `.env` on this laptop

```
ENVIRONMENT=local
SECRET_KEY=<paste generated value>
BOOTSTRAP_ADMIN_EMAIL=admin@localhost
BOOTSTRAP_ADMIN_PASSWORD=correct-horse-admin1
PUBLIC_BRAND_NAME=Northstar Dispo
PUBLIC_MAILING_ADDRESS=123 Main St, Dallas, TX 75201
DATABASE_URL=sqlite+aiosqlite:///./data/northstar.db
REDIS_URL=
S3_ENDPOINT=
MAIL_USERNAME=
MAIL_PASSWORD=
ADMIN_REQUIRE_2FA=false
EARLY_ACCESS_DEFAULT_HOURS=0
```

Fill `MAIL_*` and keep `PUBLIC_MAILING_ADDRESS` when you are ready to leave sandbox. Fill Postgres/Redis/S3 URLs only when Compose is up — see [env.md](env.md) and [deploy.md](deploy.md).
