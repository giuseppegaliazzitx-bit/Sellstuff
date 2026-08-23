# Northstar Dispo — Product & Engineering Design

> **Status:** Design only. No implementation this phase.  
> **Working name:** Northstar Dispo (placeholder — real name/domain live in `.env`)  
> **Inspiration:** New Western Marketplace (browse + map + deal detail + agent contact + documents + disclosures)  
> **Constraint from stakeholders:** React frontend, Python FastAPI backend, Docker for local *and* hosting, login-gated, client vs admin roles.  
> **Date:** 2026-08-22  
> **Revised:** 2026-08-22 — stakeholder answers locked (brand in env, open register, list price + ARV, OpenStreetMap, Gmail via env app password, hosting handed to brother).  
> **Revised v2:** 2026-08-22 — (1) GitHub workflow on `github.com/giuseppegaliazzitx-bit/Sellstuff` is **mandatory** for every build step (§6.2–6.8, Appendix G); (2) JWT session + verification token model made explicit (§5.4, §8.4–8.6, Appendix H); (3) wholesaler desk features added from dispo experience (§10.5, §9); (4) engineering hardening — integer cents, outbox, media auth, Gmail send caps, CI matrix, GHCR images (§6.5–6.6, §13.8); (5) new open questions in §20.  
> **Repository:** `https://github.com/giuseppegaliazzitx-bit/Sellstuff.git` (default branch `main`)

This document is the source of truth until Phase 0 starts. Every later phase must be able to **test itself** before the next phase begins, and every phase lands on `main` through the procedure in §6.

### What changed in v2 (read this first)

| Area | v1 said | v2 says | Where |
|---|---|---|---|
| Source control | "starts from main, ends mergeable" | **Mandatory GitHub procedure**: phase branch → checkpoint commits → push → PR → CI green → merge → tag → images on GHCR. Nothing is "built" until it is on a branch in `Sellstuff`. | §6.2–6.8, §16 rules, Appendix G |
| Session tokens | "cookies, access short-lived, refresh rotating" (mechanism unspecified) | **JWT access token in an HttpOnly cookie** (15 min, HS256, `role/status/ver/jti` claims) + **DB-backed rotating refresh token with reuse detection** + `ver` bump for instant revocation. JWT also signs verify-email, password-reset, tracked blast links, unsubscribe, and the nginx media check. | §5.4, §8.4–8.6, §15.1, Appendix H |
| Desk features | §10.3 catalog | + buyer-list import with pre-approval, buyer tiers & early access, "offers due" deadline, ranked backup offers + EMD, group showing windows, contract clock, price history, deal structure / JV fields, video walkthrough, Texas equitable-interest acknowledgment, versioned terms, watermarked downloads, tags / lead source, contact-click tracking, notification center, blast campaigns with tracked links + one-click unsubscribe | §10.5, §9, §16 |
| Email at scale | "blast via SMTP" | A Gmail app-password SMTP account has a **daily send cap** (≈500 consumer / ≈2,000 Workspace). Blasts are queued through a Postgres outbox, throttled, and capped from env; the UI says when a blast will take more than a day. CAN-SPAM footer + unsubscribe are required before the first blast. | §13.8, §5.6 |
| Money / time / IDs | unspecified | Integer cents, UTC `timestamptz` + market timezone, UUIDv7 keys, soft delete on deals & users, single Alembic head enforced in CI | §9.0, §17 |
| Photos | a signed URL per photo | nginx `auth_request` validates the access JWT → stable, cacheable `/media/*` URLs. Documents stay presigned + audited (+ optional per-viewer watermark). | §7.4, §8.6, §15.1 |
| Images to prod | build on the brother's box | CI builds tagged images and pushes to GHCR; the box pulls by `IMAGE_TAG`; rollback = previous tag | §6.6, §7.2, §7.5 |
| Questions | §20 | New questions added. Only Q1–Q3 block Phase 0. | §20 |

Everything v1 locked stays locked. v2 adds; it does not re-open.

---

## Table of contents

1. [What we are building](#1-what-we-are-building)
2. [Who it is for](#2-who-it-is-for)
3. [What New Western actually is (so we clone the right product)](#3-what-new-western-actually-is)
4. [Product principles](#4-product-principles)
5. [Decisions (stack, database, hosting)](#5-decisions)
6. [Repository, folder structure & GitHub workflow (mandatory)](#6-repository-folder-structure--github-workflow-mandatory)
7. [Docker architecture](#7-docker-architecture)
8. [Roles, auth, access model & JWT token model](#8-roles-auth-and-access-model)
9. [Domain model](#9-domain-model)
10. [Feature catalog](#10-feature-catalog)
11. [Client experience](#11-client-experience)
12. [Admin experience](#12-admin-experience)
13. [Chat, email, and Gmail (SMTP + app password)](#13-chat-email-and-gmail-smtp--app-password)
14. [API surface (by bounded context)](#14-api-surface)
15. [Security](#15-security)
16. [Phased delivery (with test cases)](#16-phased-delivery)
17. [Test strategy](#17-test-strategy)
18. [Non-goals (v1)](#18-non-goals-v1)
19. [Risks](#19-risks)
20. [Locked decisions & remaining questions](#20-locked-decisions--remaining-questions)
21. [Definition of done for the whole product](#21-definition-of-done)

Appendices: A Visual language · B Deal status machine · C What we changed from New Western · D Phase dependency graph · E Gmail app-password cheat sheet · **F Offer status machine (v2)** · **G Git quick-reference card (v2)** · **H JWT claim reference (v2)**

---

## Locked stakeholder decisions (2026-08-22)

These override earlier open questions. They are product law until someone changes them in writing.

| # | Question | Locked answer | Engineering consequence |
|---|---|---|---|
| 1 | Real brand name / domain? | **In the works. Leave it in `.env`.** | Never hardcode a final name, logo, phone, email, or domain. Placeholder in UI is “Northstar Dispo”. Runtime `GET /api/v1/public/config` reads env so the host can rebrand **without a frontend rebuild**. |
| 2 | Invite-only, or open register? | **Open and register.** | Anyone can create an account. No invite code required. Accounts start `pending`; admin approves before inventory is visible. `REQUIRE_ADMIN_APPROVAL` lives in `.env` (default `true`) if they later want instant access. |
| 3 | Economics shown to buyers? | **List price + ARV only.** | Client API and UI never return rehab, assignment fee, or MAO. Admin inventory editor still has the full wholesaler math. |
| 4 | Maps? | **OpenStreetMap.** | Leaflet + OSM tiles. No Google Maps key, no Google billing. Satellite toggle uses Esri World Imagery (no key). Geocode via Nominatim, cached, rate-limited. |
| 5 | Dedicated Gmail or personal? | **Leave in `.env`. Set up later with email + 16-char password.** | **Not OAuth.** Gmail **App Password** (16 chars) + SMTP send + IMAP idle/poll. Empty credentials → sandbox (write `.eml`, skip IMAP). Admin Settings shows mailbox status, not a Google consent screen. |
| 6 | Where Compose runs? | **Brother handles hosting.** App must be fully containerized. Provider not our decision. | Our job: `docker compose` that boots the whole graph from `.env`. Phase 12 is a **handoff packet** (prod overlay, `.env.example`, runbook), not “we SSH to a VPS.” |
| 7 | Source control? (v2) | **GitHub — `github.com/giuseppegaliazzitx-bit/Sellstuff`. Mandatory procedure for every build step.** | Phase branches, checkpoint commits, push after every checkpoint, PR into `main`, CI green before merge, tag per phase, images published to GHCR from the tag. Detail in §6.2–6.8. No code change lands any other way — this applies to a human and to an AI coding agent alike. |
| 8 | Stronger verification? (v2) | **Use JWT.** | JWT is the access/session token (HttpOnly cookie, 15 min, instantly revocable via `ver`) and the signing format for verify-email, password-reset, tracked links, unsubscribe, and the nginx media check. Refresh token stays database-backed and rotated. Never `localStorage`. Detail in §5.4, §8.4–8.6, Appendix H. |
| 9 | Team size? (v2) | **Two people: the builder (you) and the brother (hosting).** | No review bureaucracy. CI is the gatekeeper; the builder follows the demo script before merging; the brother signs off on Phase 12 only. `ops` role is out of v1 — both humans are `admin`. Branch protection depends on the GitHub plan (§20 Q1). |

---

## 1. What we are building

A **private, login-only wholesale real estate marketplace**.

Cash buyers (clients) register, get approved, pick a market, browse **off-market / wholesale deals** on a split **map + card grid**, open a deal, see **list price + ARV**, download a document packet, and contact the wholesaler by **phone, in-app chat, or email**.

The wholesaler (admin) runs the business from a second surface: **inventory CRUD, buyer CRM, notes, inbound/outbound email, chat, showings, offers, and deal metrics**.

This is **not** Zillow. It is a **disposition desk** with a buyer portal. Inventory is privileged. Unauthenticated visitors see login/register/legal only.

---

## 2. Who it is for

### Primary operator (Admin)

An experienced wholesaler / dispo manager. Their day looks like:

- Drop a new deal (photos, list price, ARV, rehab, assignment fee, occupancy, access). Rehab and fee stay internal.
- Blast or match it to the buyer list.
- Field “is this still available?” via call, chat, and email.
- Track who is serious (proof of funds, past closes, buying criteria).
- Book accompanied showings. Nobody walks a vacant house alone.
- Take an offer / assignment, mark the deal pending, keep the rest of the list warm.
- Know which listings are aging, which photos convert, which buyers ghost.
- Watch the **contract clock**: the seller contract has a close-by date and an option period; every day past it without a buyer costs the fee or the deal. (v2)
- Keep **backup buyers** warm — the first accepted offer flakes often enough that a ranked backup list is the difference between closing and re-marketing. (v2)
- Run **group showing windows** (“Saturday 10–11, meet at the curb”) rather than twenty individual appointments. (v2)
- Protect the deal from **daisy-chaining** (another wholesaler re-marketing your contract): confidentiality terms, watermarked packets, and an audit trail of who downloaded what. (v2)
- Bring the **existing buyer list** (years of emails and phone numbers in a spreadsheet) into the system on day one. A CRM that starts empty gets abandoned by week two. (v2)
- Blast a new deal to the list — and know that a Gmail account can only send a few hundred emails a day, so the blast must queue and tell them when it will finish. (v2)

### Primary visitor (Client)

A cash buyer, landlord, or flipper who registered on the open form and was approved. They need:

- Fast scan of what’s available in *their* market, sorted by price or newest.
- Map context (cluster pins, price bubbles) on OpenStreetMap.
- Enough numbers to decide if they should call: beds, baths, sqft, year, **list price, ARV**, occupancy.
- One-tap contact: call, email, chat — **about this house**, not a generic form.
- Documents: packet, comps, tax, title snippets.
- A saved-search / watchlist so they don’t miss the next $70k Dallas deal.
- The rules of engagement up front: **when offers are due**, whether it is drive-by only or there is a showing window, whether a video walkthrough exists, and — in Texas — that the shop holds an **equitable interest**, not title. (v2)
- To be treated as the serious buyer they are: verified proof of funds and a closing history should earn **earlier access** to new inventory. (v2)

They do **not** see rehab estimates or assignment fee. That is desk-only math.

### Roles we will *not* build in v1

- Public unauthenticated shoppers of inventory
- Seller / acquisition portal (motivated seller intake)
- Multi-broker franchise / market-by-market agent network like New Western’s full org
- Buyer–buyer messaging
- Transaction management / title / escrow (we track status, we do not close)

---

## 3. What New Western actually is

From the live Marketplace UI (browse + deal page), the product we are mirroring has these surfaces:

| Surface | What it does | Our version |
|---|---|---|
| Global chrome | Logo, **Browse**, **Settings**, **Log Out**. Dark bar, gold wordmark. | Same chrome; logo + wordmark from env/config. |
| Agent strip | Assigned agent photo, name, license #, **chat / phone / email** icons. | Phone/email from env + admin profile. |
| Market + sort | “Your Market: Dallas”, sort “Price (low to high)”. | Same. |
| Split browse | Google Map (Map / Satellite, cluster pins with `$70K` labels) + 2-column deal cards. | **Leaflet + OSM**, Esri satellite, same pin UX. |
| Deal card | Photo carousel, list price, full address, chips for beds / baths / sqft. | Same. ARV is **not** on the card (keeps the scan fast). ARV is on the deal page. |
| Deal page header | Back to Browse, same agent + contact icons. | Same. |
| Photo grid | Quilted gallery, “View All Photos”. | Same. |
| Deal facts | Status chip (`Available`), price, address, year built, beds/baths/sqft. | Plus **ARV**. No rehab, no assignment fee. |
| Description | Investor pitch + “Show more”. | Same. |
| Documents | Document Packet + individual comps / tax. | Same, authenticated downloads. |
| Mini-map | Pin on the subject property. | Leaflet/OSM mini-map. |
| Notices | Accordion legal + state consumer-protection PDFs. | Same copy, configurable per market later. |

We copy **this interaction model**, then add wholesaler CRM, offers, showings, Gmail-backed inbox, and metrics.

---

## 4. Product principles

1. **Nothing useful is public.** Login is the front door. Unapproved accounts see a waiting room, not inventory.
2. **Every deal is confidential.** Document downloads and photo access are authenticated and audit-logged.
3. **Contact is first-class.** Phone, email, and chat sit on every deal and in global chrome.
4. **Admin sees what the client sees, plus the desk.** One “preview as client” mode, plus admin tabs.
5. **Email is real email, configured from env.** In-app chat is not a silo. SMTP/IMAP against Gmail (16-char app password in `.env`) means the same thread lives in Gmail *and* the admin inbox. If mail env is empty, the product still runs in sandbox.
6. **Brand is configuration, not code.** Name, domain, phone, support email, logo path — `.env` only.
7. **Buyer-facing numbers are list price + ARV.** Everything else is admin-only. The API enforces this, not just CSS.
8. **Maps cost $0.** OpenStreetMap + Leaflet. No Google key in the stack.
9. **Build in thin vertical slices.** Each phase ships schema + API + UI (or worker) + tests.
10. **Docker is how it runs.** Local and whatever box the brother uses are the same Compose graph with different env files. We do not pick the VPS.
11. **Git is the ledger.** (v2) Nothing is “built” until it is on a branch in `Sellstuff`, pushed, checked by CI, merged into `main`, and tagged. A phase is done when its tag exists and its images are on GHCR. §6.2–6.8.
12. **The desk runs on deadlines.** (v2) Contract close-by dates, offer deadlines, and showing windows are first-class fields with their own UI, not sentences buried in a description.
13. **Verification is signed, short-lived, and revocable.** (v2) A JWT carries identity for minutes. Anything that must be revoked — refresh tokens, suspended users, used reset links — is recorded in Postgres/Redis, never trusted to the token alone. §8.4.
14. **Assume the buyer list is the asset.** (v2) Import it, tier it, never blast it past the mailbox’s limits, and never let a bounce storm burn the shop’s Gmail reputation.

---

## 5. Decisions

### 5.1 Frontend

| Choice | Why |
|---|---|
| **React 18/19 + TypeScript + Vite** | Fast DX, typed contracts against OpenAPI. |
| **Tailwind CSS + a small token layer** | New Western look: charcoal header, ivory pages, gold (`#C0985C`) accents, quiet gray chips. |
| **React Router** (data router) | Two apps-in-one (`/app/*` client, `/admin/*` admin) with a shared auth shell. |
| **TanStack Query** | Server state for listings, pins, threads, inbox. |
| **Zustand** | UI-only: map bounds, selected pin, photo lightbox index. |
| **React Hook Form + Zod** | Forms share the same schemas the API validates. |
| **Leaflet + OpenStreetMap** | **Locked.** Marker clustering (`leaflet.markercluster`), Map / Satellite toggle (OSM + Esri World Imagery), price-label markers. No Google Maps JS API, no billing, no key. |
| **Nominatim (OSM geocoder)** | Address → lat/lng on admin save. Cached in Postgres. Strict rate limit + User-Agent. |
| **Recharts** | Admin metrics (Phase 10). |
| **Playwright** | Browser tests per phase that has UI. |
| **openapi-typescript** (v2) | `frontend/src/shared/api/types.ts` is generated from the backend OpenAPI in CI; a hand-edited type is a build failure (`openapi-sync` job, §6.5). |
| **MSW — Mock Service Worker** (v2) | Component tests mock `/api/v1` at the network layer so tests exercise the real client code, not a stub. |

No Next.js. We do not need SSR for a private app, and Docker-hosting a Vite SPA behind nginx is simpler.

The frontend **does not bake the brand name at `npm run build`**. It fetches `/api/v1/public/config` on boot so a `.env` change + API restart is enough to rename the shop.

### 5.2 Backend

| Choice | Why |
|---|---|
| **Python 3.12 + FastAPI** | Requested. Fast, typed, OpenAPI for the React client. |
| **SQLAlchemy 2.0 + Alembic** | Migrations are not optional. |
| **Pydantic v2** | Request/response + settings. All env knobs live in one `Settings` class. |
| **Uvicorn / Gunicorn** | Prod server inside the API container. |
| **ARQ (Redis)** | IMAP poll, outbound SMTP, thumbnails, “new deal” matching. |
| **aiosmtplib + aioimaplib** (or equivalent) | Gmail via app password. **No Google OAuth client, no Gmail API.** |
| **httpx** | Nominatim + API tests. |
| **pytest + pytest-asyncio** | Every phase’s contract. |
| **structlog + request-id** | Trace a chat message from browser → API → worker → SMTP. |
| **PyJWT** (v2) | Access tokens and every signed one-time token (verify-email, reset, tracked link, unsubscribe). HS256 with `SECRET_KEY`; `algorithms=["HS256"]` pinned so `alg=none` is impossible. |
| **Pillow + python-magic** (v2) | Photo pipeline (EXIF strip, resize, WebP `thumb/card/full` variants) and a magic-bytes MIME check on every upload — the extension is never trusted. |
| **pypdf + reportlab** (v2) | Per-viewer watermark overlay on document downloads (P11, `WATERMARK_DOWNLOADS`). |
| **pyotp** (v2) | Admin TOTP 2FA (P11, `ADMIN_REQUIRE_2FA`). |
| **uuid-utils** (v2) | App-side UUIDv7 primary keys (time-ordered, index-friendly). Postgres 16 has no native `uuidv7()`; PG 18 does — swap later without a schema change. |

### 5.3 Database — we are **not** using DuckDB as the system of record

DuckDB is an **analytics** engine (columnar, single-writer, file-backed). This product is **OLTP**: concurrent logins, CRM notes, chat inserts, offer writes, row-level auth.

| Store | Role |
|---|---|
| **PostgreSQL 16** | System of record. Users, deals, CRM, chat, mail, audit. |
| **Redis 7** | Sessions / refresh-token denylist, rate limits, ARQ queue, cache of map pins. |
| **Object storage** | Photos + PDFs. Local: MinIO (S3-compatible) in Compose. Prod: S3 / Cloudflare R2 / MinIO on the box — brother’s choice, we speak S3. |
| **DuckDB (optional, Phase 10+)** | Nightly extract of events → DuckDB file *inside the metrics worker* for heavy aggregations. Not the live DB. Easy to skip until metrics hurt. |

If the operator later insists on “one file, no Postgres,” SQLite can replace Postgres for a **single-tenant, single-box** deploy. That is a documented fallback, not the default. DuckDB remains analytics-only.

### 5.4 Auth — JWT access token + database-backed refresh (locked v2)

- **Email + password** for v1. **No invite codes** (open register).
- **JWT is the session token, and it lives in an HttpOnly, Secure, SameSite=Lax cookie.** Never `localStorage`, never readable by JavaScript — XSS would otherwise steal inventory + inbox. Access token: 15 minutes, HS256 signed with `SECRET_KEY`, claims `sub, role, status, ver, sid, jti, typ, iat, exp, iss, aud`.
- **Refresh token is opaque and database-backed** (only its SHA-256 is stored in `refresh_tokens`), 14 days, **rotated on every use, reuse revokes the whole family**. A JWT buys nothing for a token whose entire job is to be single-use and revocable; a database row does that correctly.
- **Instant revocation despite a stateless access token:** every user has `token_version`; the JWT carries it as `ver`; each request compares it to a Redis-cached copy (`user:{id}:ver`). Suspend, approve, role change, password change → bump `ver` → every outstanding access token for that user dies on its next request. Cost: one Redis `GET` per request.
- **JWT is also the format for every signed one-time token:** email verification (`typ=verify_email`, 24 h), password reset (`typ=reset`, 30 min, bound to `ver`), tracked links in blasts (`typ=track`, 30 d), one-click unsubscribe (`typ=unsub`, 90 d), and the nginx `auth_request` check on `/media/*`. Every verifier pins the algorithm and the `typ`, so a token minted for one purpose can never be replayed for another.
- `Authorization: Bearer <access-jwt>` is accepted as an alternative to the cookie for non-browser clients (API tests, a future mobile app). Bearer requests skip CSRF (no ambient cookie authority). The SPA itself always uses cookies.
- **Argon2id** password hashing. Minimum 12 characters, checked against a bundled top-10k-password list; no composition rules (they produce worse passwords).
- **Role claim**: `client` | `admin`. (`ops` — read-only admin for a VA — is deferred; v2 team is two people and both are `admin`.) **Status claim** `pending|active|suspended`. Both are enforced server-side on every request and kept fresh by the `ver` mechanism, so a 15-minute token never outlives a suspension.
- Registration is **open**. Default: new users land in `pending`. Inventory is hidden until an admin approves. This is how a real wholesaler protects off-market deals while still letting anyone apply.
- `REQUIRE_ADMIN_APPROVAL=true` in `.env` (default). Set `false` only if they later want instant browse-on-signup.
- **Email verification runs only when mail is configured** (`REQUIRE_EMAIL_VERIFICATION=auto`): blank `MAIL_*` → the step is skipped and the admin sees an “unverified” badge; configured → the buyer must click the link before the Approve button enables. Admin approval is the real gate either way.
- **Terms are versioned** (`TERMS_VERSION` in env). Registration records which version was accepted, from which IP; bumping the version forces re-acceptance at next login. The terms carry confidentiality, **no daisy-chaining**, independent verification, and no unaccompanied entry.
- **SMS consent checkbox at registration** (unchecked by default, timestamped). Texts are not in v1, but TCPA consent collected now means the Twilio phase later does not need to re-contact the whole list.
- **Admin TOTP 2FA** (`ADMIN_REQUIRE_2FA`, default `false` until P11 ships). The admin account is the mailbox, the inventory, and the buyer list; it gets a second factor.
- Optional later: magic link. **No Google login for clients** in v1. Mail credentials are for the *shop mailbox*, not buyer identity.

Full token model, cookie names, CSRF, rotation, and the one-time tokens: §8.4–8.6 and Appendix H.

### 5.5 Hosting

**Fully containerized. We do not choose the VPS, region, or registrar.** The brother deploys.

What we owe him:

- `docker-compose.yml` + `docker-compose.prod.yml` that bring up nginx, frontend assets, API, worker, Postgres, Redis, MinIO.
- `.env.example` with every knob documented.
- A runbook: copy env, `compose up`, create admin, point DNS, backups.
- Healthchecks so a host-level watchdog can restart unhealthy containers.
- No “install Python on the host.” No Node on the host. Docker Engine + Compose plugin only.

Not Kubernetes. Not a PaaS that fights this graph — unless *he* picks one that runs Compose/containers.

### 5.6 `.env` is the operator console

All of the following live in env, **never in source**. `.env.example` is committed; `.env` is not.

```text
# --- brand (public, safe to expose to the browser via /public/config) ---
PUBLIC_BRAND_NAME=Northstar Dispo
PUBLIC_BRAND_TAGLINE=
PUBLIC_DOMAIN=localhost
PUBLIC_SUPPORT_PHONE=
PUBLIC_SUPPORT_EMAIL=
PUBLIC_LOGO_URL=                 # empty = typographic wordmark
PUBLIC_FOOTER_LEGAL_NAME=
PUBLIC_PRIMARY_STATE=TX          # v2: which state notice set shows by default (TX = equitable-interest disclosure)
PUBLIC_MAILING_ADDRESS=          # v2: physical address for the CAN-SPAM footer; blasts refuse to send while empty

# --- auth / product policy ---
REQUIRE_ADMIN_APPROVAL=true
REQUIRE_EMAIL_VERIFICATION=auto  # v2: auto = only when MAIL_* is configured; true/false forces it
ADMIN_REQUIRE_2FA=false          # v2: flip to true after P11 once every admin has enrolled TOTP
SECRET_KEY=                      # required, 32+ bytes; signs every JWT
SECRET_KEY_PREVIOUS=             # v2: optional; verifies old tokens during rotation, never signs (§15.1)
JWT_ISSUER=                      # v2: defaults to PUBLIC_DOMAIN
ACCESS_TOKEN_TTL_MINUTES=15      # v2
REFRESH_TOKEN_TTL_DAYS=14        # v2
COOKIE_NAME_PREFIX=__Host-       # v2: prod; set empty for plain-http local dev (§8.5)
TERMS_VERSION=2026-08-22         # v2: bump to force every buyer to re-accept terms at next login
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=

# --- database / redis / s3 (compose fills hostnames) ---
DATABASE_URL=postgresql+psycopg://...
REDIS_URL=redis://redis:6379/0
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET_PHOTOS=photos
S3_BUCKET_DOCS=docs

# --- mailbox (Gmail app password — 16 chars, spaces optional) ---
# Leave blank to run sandbox mail (writes .eml to storage, no network).
MAIL_FROM=
MAIL_USERNAME=                   # full Gmail or Workspace address
MAIL_PASSWORD=                   # 16-character Google App Password
MAIL_SMTP_HOST=smtp.gmail.com
MAIL_SMTP_PORT=587
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_POLL_SECONDS=60
MAIL_DAILY_LIMIT=450             # v2: hard cap on outbound per day. Gmail consumer ≈500, Workspace ≈2,000 — stay under
MAIL_RATE_PER_MINUTE=20          # v2: blast throttle; transactional mail (reset, approval) jumps the queue

# --- maps (no keys required for OSM + Esri imagery) ---
MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
MAP_SAT_TILE_URL=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
NOMINATIM_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=NorthstarDispo/1.0 (contact: ${PUBLIC_SUPPORT_EMAIL})

# --- uploads / deal features (v2) ---
PHOTO_MAX_MB=15
DOC_MAX_MB=25
WATERMARK_DOWNLOADS=false        # P11: stamp buyer email + timestamp on every PDF download
EARLY_ACCESS_DEFAULT_HOURS=0     # P9: tier-A buyers see a new deal this many hours before everyone else
VIDEO_EMBED_HOSTS=youtube.com,youtube-nocookie.com,vimeo.com,matterport.com   # CSP + sanitizer allowlist

# --- hosting ---
CORS_ORIGINS=https://YOUR_DOMAIN
COOKIE_SECURE=true
IMAGE_TAG=latest                 # v2: prod pulls ghcr.io/giuseppegaliazzitx-bit/sellstuff-{backend,frontend}:${IMAGE_TAG}. Rollback = previous tag
SENTRY_DSN=                      # v2: optional error capture; blank = off
LOG_LEVEL=info
```

Brother (or we, later) fills mail + brand + secrets. The app must **boot and pass tests with mail left blank**.

---

## 6. Repository, folder structure & GitHub workflow (mandatory)

Monorepo. One git repo, one Compose file, two deployable images.

**Repository (locked, v2):** `https://github.com/giuseppegaliazzitx-bit/Sellstuff.git` — default branch `main`. The repo name is not the brand; the brand lives in `.env` (§5.6). Everything in §6.2–6.8 is **mandatory for anyone or anything that writes code in this repo, including an AI coding agent**. If it is not on a pushed branch in this repo, it was not built.

### 6.1 Folder structure

```text
Sellstuff/                             ← git root (github.com/giuseppegaliazzitx-bit/Sellstuff)
├── DESIGN.md                          ← this file
├── README.md                          ← how to run (written in Phase 0) — the brother’s entry point
├── CONTRIBUTING.md                    ← §6.2–6.8 verbatim, so the builder reads it from the repo (v2)
├── CHANGELOG.md                       ← one entry per phase tag (v2)
├── docker-compose.yml                 ← local + staging
├── docker-compose.prod.yml            ← hosting overlay (tls, resources, no bind-mounts, GHCR images)
├── .env.example                       ← all knobs, no secrets
├── .gitignore                         ← .env, *.eml, pgdata/, minio-data/, node_modules/, dist/, .venv/, playwright-report/ (v2)
├── .dockerignore
├── .pre-commit-config.yaml            ← ruff, ruff-format, prettier, eslint, gitleaks (v2)
├── Makefile                           ← make up / test / lint / backup
│
├── .github/                           ← (v2)
│   ├── workflows/
│   │   ├── ci.yml                     ← lint, unit, api, component, migrations, openapi-sync — every push
│   │   ├── e2e.yml                    ← Playwright against Compose — PRs to main + nightly on main
│   │   ├── infra.yml                  ← compose config, env-example sync, hadolint, denylist-grep — PRs to main
│   │   └── release.yml                ← on tag: build + push images to GHCR, GitHub Release from CHANGELOG
│   ├── PULL_REQUEST_TEMPLATE.md       ← phase checklist (§6.4)
│   ├── ISSUE_TEMPLATE/bug.md
│   ├── CODEOWNERS                     ← @giuseppegaliazzitx-bit (enforced only if the plan allows — §20 Q1)
│   └── dependabot.yml                 ← pip, npm, docker, github-actions — weekly, grouped
│
├── infra/
│   ├── nginx/
│   │   ├── nginx.conf                 ← reverse proxy, SPA fallback, /api, /assets
│   │   └── tls/                       ← prod certs mount (or Caddy)
│   ├── postgres/
│   │   └── init/                      ← optional extensions
│   └── backup/
│       └── backup.sh                  ← pg_dump + object-store sync
│
├── backend/
│   ├── Dockerfile                     ← multi-stage: deps → runtime
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── tests/
│   └── app/
│       ├── main.py
│       ├── core/                      ← config (pydantic-settings), security, logging
│       ├── db/
│       ├── models/
│       ├── schemas/                   ← DealPublic vs DealAdmin (ARV vs full math)
│       ├── api/v1/
│       │   ├── public.py              ← /public/config (no auth)
│       │   ├── auth.py
│       │   ├── users.py
│       │   ├── markets.py
│       │   ├── deals.py
│       │   ├── documents.py
│       │   ├── chat.py
│       │   ├── mail.py
│       │   ├── crm.py
│       │   ├── offers.py
│       │   ├── showings.py
│       │   └── metrics.py
│       ├── services/
│       ├── workers/                   ← IMAP poll, SMTP send, thumbs, match
│       └── integrations/
│           ├── smtp.py
│           ├── imap.py
│           ├── geocode.py             ← Nominatim
│           └── storage.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── app/router.tsx
│       ├── app/guards.tsx
│       ├── app/layout/
│       ├── features/
│       │   ├── auth/
│       │   ├── browse/                ← Leaflet map + cards
│       │   ├── deal/
│       │   ├── chat/
│       │   ├── settings/
│       │   └── admin/
│       ├── shared/
│       │   ├── map/                   ← Leaflet adapter (OSM + Esri). No Google import.
│       │   └── api/
│       └── styles/tokens.css
│
└── docs/
    ├── phases/                        ← NN-slug.md per phase: goal, test matrix, demo script, green-run record
    ├── decisions/                     ← ADR-style notes; where spike/* findings land (v2)
    ├── api.md
    └── runbooks/
        ├── deploy.md                  ← for the brother
        ├── env.md                     ← every variable explained
        ├── gmail-app-password.md      ← how to mint the 16-char password
        └── backup-restore.md
```

Rules:

- Frontend never talks to Postgres. Only `/api/v1`.
- `services/` has no HTTP.
- Client serializers **cannot** accidentally include `rehab_*` or `assignment_fee`. Separate Pydantic models: `DealPublic` vs `DealAdmin`.
- No `GOOGLE_MAPS` or `GMAIL_OAUTH` symbols in the repo.
- `frontend/src/shared/api/types.ts` is generated, never hand-edited (v2).

### 6.2 Branch model (v2, mandatory)

| Branch | From | Merges into | Lifetime | Purpose |
|---|---|---|---|---|
| `main` | — | — | forever | Always green, always deployable. **Nobody commits to it directly.** Every change arrives by PR. |
| `phase/NN-slug` (e.g. `phase/01-auth`) | `main` | `main` | one phase | The phase branch. Opened at phase start, closed by the phase PR. |
| `feat/NN-slug` / `fix/NN-slug` | the phase branch | the phase branch | hours–days | A slice inside a phase — used when two things are in flight or a slice will take more than a day. Optional for small phases. |
| `spike/slug` | `main` or a phase branch | **never merged** | hours | Throwaway experiment (e.g. SSE vs polling, Caddy vs nginx). Findings go to `docs/decisions/NNN-slug.md` on the phase branch; the spike branch is deleted. |
| `hotfix/slug` | `main` | `main`, then cherry-picked into the open phase branch | hours | Production bug between phases. Produces a patch tag. |

No `develop`, no `release/*`: tags do that job (§6.6). One phase in flight at a time, except where Appendix D allows overlap (P3 ∥ P5) — then two phase branches, each rebased on `main` before its PR.

Two-person team (locked #9): the builder works on the branches; the brother only ever needs `main` and a tag. He never needs to understand the branch model to deploy.

### 6.3 Commit checkpoints (v2, mandatory per phase)

A phase is built as a **sequence of checkpoint commits**, not one commit at the end. Every checkpoint leaves the tree buildable: `make lint` passes and the tests that exist for that checkpoint pass (or are marked `xfail` with the test ID in the reason). Minimum checkpoints, in order:

| # | Checkpoint | Example commit subject |
|---|---|---|
| 1 | Open the phase: branch + `docs/phases/NN-slug.md` skeleton (goal, test IDs, empty demo script) | `chore(phase-01): open phase — auth, roles, open register` |
| 2 | Schema: Alembic migration + SQLAlchemy models, downgrade tested | `feat(db): users, refresh_tokens, terms_acceptance (P1)` |
| 3 | Backend: Pydantic schemas, services, routes | `feat(auth): register/login/refresh with JWT access + rotating refresh` |
| 4 | Backend tests covering the phase’s test IDs | `test(auth): P1-T1..T12 api + unit` |
| 5 | Frontend: UI for the slice | `feat(web): login, open register, waiting room, route guards` |
| 6 | Component + E2E tests | `test(e2e): P1-T13..T15 register → approve → browse` |
| 7 | Env + docs: `.env.example`, README/runbook deltas, demo script written | `docs(phase-01): demo script, env knobs, test matrix` |
| 8 | Close: CHANGELOG entry, green `make test` run recorded in the phase doc | `chore(phase-01): close phase — all P1 tests green` |

Worker-only phases (P7 IMAP, P9 matching) replace 5–6 with worker + integration tests. Phases that touch several bounded contexts repeat 2–6 per context.

Rules:

- **Conventional Commits**: `type(scope): subject`. Types `feat fix test docs chore refactor perf ci build revert`. Scopes are the bounded contexts: `auth deals browse chat mail crm offers showings metrics web db infra ci docs phase-NN`. Subject ≤ 72 chars, imperative. Body says *why*. Footer: `Phase: NN`, `Tests: P1-T1,P1-T2`, `Refs: #issue`.
- **Push after every checkpoint.** Work that exists only in a sandbox or on one laptop does not exist. `git push` is part of the checkpoint, not an afterthought.
- `wip:` commits are allowed on a phase branch while something is mid-air. They are squashed into a real checkpoint before the PR opens. `wip:` never reaches `main`.
- **One Alembic migration per PR.** CI fails on more than one head (`alembic heads`) or on a failed `downgrade -1 && upgrade head`.
- A commit that touches `DealPublic`, `schemas/deal*.py`, `api/v1/deals.py`, or `api/v1/map.py` carries the denylist test in the same commit (§17).
- Never commit `.env`, `*.eml`, credentials, fixtures with real buyer data, or generated `dist/`. Pre-commit runs `gitleaks`; GitHub secret scanning + push protection are switched on in repo settings (free on all plans).

### 6.4 Pull request & merge procedure (v2, mandatory)

One PR per phase branch into `main`, plus optional small PRs from `feat/*` into the phase branch. PR title: `Phase NN — <name>`. The template checklist — every box, no exceptions:

```text
- [ ] Goal from DESIGN.md §16 restated in one sentence
- [ ] Test matrix: every P<NN>-T* ID listed with the file that covers it
- [ ] `make test` green locally *inside Compose*; CI green on this PR
- [ ] DealPublic denylist test present and green (Phase 2 onward)
- [ ] Exactly one new Alembic revision; downgrade tested
- [ ] `.env.example` updated for every new Settings field (CI checks, but say so)
- [ ] docs/phases/NN-*.md has the demo script, and a human followed it once
- [ ] No secrets, no `.env`, no `GOOGLE_MAPS` / `GMAIL_OAUTH` symbols (CI greps)
- [ ] CHANGELOG.md entry under "Unreleased"
- [ ] Rollback note: what to run if this phase must come out (usually `alembic downgrade -1` + previous IMAGE_TAG)
```

Merge rules:

| PR | Strategy | Why |
|---|---|---|
| `phase/*` → `main` | **Merge commit (`--no-ff`)** | Checkpoint history survives; `git log --first-parent main` reads as one line per phase. |
| `feat/*` → `phase/*` | Squash | Keeps the phase branch to checkpoints. |
| `hotfix/*` → `main` | Squash, then `git cherry-pick` into the open phase branch | One patch commit, no divergence. |

Required status checks before merge: `lint`, `backend-tests`, `frontend-tests`, `migrations`, `openapi-sync`, `e2e`, `infra`, `denylist-grep`. A red check blocks the merge; nobody merges “to fix it on main.” Delete the branch after merge.

Review, two-person edition: the builder follows the demo script in `docs/phases/NN-*.md` and comments “Demo script followed — approving” on the PR. The brother is requested as reviewer on Phase 0 (README), Phase 6 (mail runbook), and Phase 12 (handoff) — the three PRs that change what *he* has to do. Whether GitHub can *enforce* “CI green + approval” depends on the plan (§20 Q1); if it cannot, the rule is still the rule — `gh pr merge` is only ever run after `gh pr checks` shows all green.

### 6.5 CI — GitHub Actions (v2)

| Job | Trigger | What |
|---|---|---|
| `lint` | every push | `ruff check`, `ruff format --check`, `mypy app/`, `eslint`, `tsc --noEmit`, `prettier --check` |
| `backend-tests` | every push | pytest with `services:` Postgres 16 + Redis 7 + MinIO; coverage ≥ 80 % on `app/services` and `app/api`, reported on the PR |
| `frontend-tests` | every push | vitest + Testing Library (MSW-mocked API) |
| `migrations` | every push | `alembic upgrade head` → `alembic heads` must be exactly 1 → `alembic downgrade -1` → `alembic upgrade head` |
| `openapi-sync` | every push | regenerate `types.ts` from the live OpenAPI; `git diff --exit-code` |
| `e2e` | PRs to `main`, nightly on `main` | `docker compose up` the full graph with mail blank; Playwright suite; upload trace + video on failure |
| `infra` | PRs to `main` | `docker compose config` for dev and prod overlay, `.env.example` ↔ `Settings` sync, `hadolint` on both Dockerfiles |
| `denylist-grep` | PRs to `main` | build the client bundle; fail if it contains `assignment_fee`, `rehab_low`, `rehab_high`, `mao`, `lockbox_code`, `contract_close_by`, `jv_` |
| `security` | weekly + PRs to `main` | `pip-audit`, `npm audit --audit-level=high`, Trivy on built images (from P11) |
| `release` | tag `v*` or `phase-*`; also `workflow_dispatch` on any branch (builds `:sha-*` only, no tag) | build backend + frontend images with `APP_VERSION`/`APP_COMMIT` build args, push `ghcr.io/giuseppegaliazzitx-bit/sellstuff-{backend,frontend}:{tag}` and `:sha-{short}`, create a GitHub Release from the CHANGELOG section (tags only) |

Path filters: a docs-only PR runs `lint` + `infra` only. GitHub-hosted minutes are finite on a private repo (§19), so `e2e` runs on PRs to `main` and nightly, not on every push. Every job uses the same Compose graph the brother will run — there is no “CI-only” stack.

### 6.6 Tags, versions, images (v2)

- Every phase merge is tagged twice, from the merge commit: `phase-NN` (the stable name used in docs) and `v0.NN.0` (SemVer). Phase 12’s merge is `v1.0.0`. Hotfixes bump patch (`v0.7.1`).
- Tags are **annotated** (`git tag -a`) with the phase goal as the message.
- `release.yml` builds images from the tag; the prod overlay pulls `ghcr.io/giuseppegaliazzitx-bit/sellstuff-backend:${IMAGE_TAG}` and `-frontend`. The brother never builds on the box (§7.2). Rollback is `IMAGE_TAG=<previous> docker compose pull && docker compose up -d`.
- `GET /version` returns the tag and short SHA baked in at build, so “what is running?” has a one-line answer.
- GHCR storage for private packages is limited on a free plan (§19); `release.yml` keeps the last 5 tags and `:sha-*` images for 30 days. The brother always pins a `v*` tag, never `latest`.

### 6.7 Hotfix & rollback (v2)

1. `git switch -c hotfix/slug main` → fix + test → PR → squash merge → tag `vX.Y.(Z+1)` → images build.
2. Brother: set `IMAGE_TAG`, `docker compose pull`, `docker compose up -d`. Worse? Previous tag, same two commands.
3. `git switch phase/NN-current && git cherry-pick <hotfix-sha>` so the open phase carries the fix.
4. If a migration is involved, the hotfix ships a tested downgrade and the runbook says which `alembic downgrade` pairs with which `IMAGE_TAG`.

### 6.8 The procedure — what the builder does, every time (v2, mandatory)

This is the literal checklist for a human or an agent. “Build anything” means any code, config, migration, or doc change — there is no change small enough to skip it.

```text
 0. git fetch origin && git switch main && git pull --ff-only
 1. git switch -c phase/NN-slug                  # or feat/NN-slug off the phase branch
 2. Write docs/phases/NN-slug.md (goal, test IDs, empty demo script)
    git add -A && git commit -m "chore(phase-NN): open phase — <name>"
    git push -u origin HEAD
 3. For each checkpoint in §6.3:
      make lint && make test-unit                # green before committing
      git add -p && git commit                   # conventional commit; footer Phase:/Tests:
      git push
 4. Before the PR:
      git fetch origin && git rebase origin/main # phase branch only; never rebase main
      make test                                  # full suite inside Compose
      squash any wip: commits (git rebase -i origin/main)
      git push --force-with-lease                # only on your own phase/feat branch
 5. gh pr create --base main --title "Phase NN — <name>" \
        --body-file .github/PULL_REQUEST_TEMPLATE.md
 6. gh pr checks --watch                         # red → fix on the branch with a new checkpoint commit
 7. Follow docs/phases/NN-slug.md demo script; comment approval on the PR
    (request the brother on P0, P6, P12)
 8. gh pr merge --merge --delete-branch          # --squash for feat/* and hotfix/*
 9. git switch main && git pull --ff-only
    git tag -a phase-NN -m "Phase NN: <goal>"
    git tag -a v0.NN.0 -m "Phase NN: <goal>"
    git push origin phase-NN v0.NN.0             # release.yml publishes images
10. Next phase starts at step 0.
```

Merge conflicts are resolved on the branch, then `make test` runs again before pushing. `git push --force` is never used; `--force-with-lease` is allowed only on your own `phase/*` / `feat/*` branch after a rebase or squash, never on `main`. If a phase must be abandoned, the branch stays (renamed `abandoned/NN-slug`) with a note in `docs/decisions/`, so the work is recoverable.

Testing-driven branching: when a change exists only to *try* something (a library, a tile provider, SSE), it goes on `spike/*` and the conclusion — not the code — is what gets merged, as a decision note. When a fix needs its own verification on a real box before it is trusted, it goes on `fix/*`, the brother pulls the `:sha-*` image CI built for that branch into a staging `.env`, and only then does it merge.

---

## 7. Docker architecture

Docker is not a convenience wrapper. It is **how the product is developed, tested, and handed off**.

### 7.1 Services (Compose)

```text
                    ┌─────────────┐
     443/80         │  nginx      │  SPA + TLS terminator + /api reverse proxy
                    └──────┬──────┘
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
     ┌──────────┐   ┌────────────┐   ┌──────────┐
     │ frontend │   │  backend   │   │  worker  │  same image as backend, different CMD
     │  (static)│   │  (uvicorn) │   │  (arq)   │
     └──────────┘   └─────┬──────┘   └────┬─────┘
                          │               │
                    ┌─────┴──────┐        │
                    │  postgres  │◄───────┘
                    └────────────┘
                    ┌────────────┐   ┌────────────┐
                    │   redis    │   │   minio    │  S3 API for photos/pdfs
                    └────────────┘   └────────────┘
```

| Service | Image | Notes |
|---|---|---|
| `nginx` | `nginx:1.27-alpine` (or Caddy) | Serves `frontend` build, proxies `/api` → backend. TLS is the brother’s call (Caddy on host, or we ship a Caddy service). |
| `frontend` | multi-stage Node build | In **prod**, nginx serves the built files. In **dev**, Vite with HMR, proxied. |
| `backend` | Python slim | Gunicorn + Uvicorn workers. Health: `GET /healthz`. |
| `worker` | same as backend | ARQ: IMAP poll, SMTP send, thumbnails, matching. |
| `postgres` | `postgres:16-alpine` | Volume `pgdata`. Named, backed up. |
| `redis` | `redis:7-alpine` | AOF persistence on. |
| `minio` | `minio/minio` | Buckets: `photos`, `docs`. Prod may point `S3_*` at real S3/R2 instead. |

### 7.2 Dev vs prod overlays

**`docker-compose.yml` (dev)**

- Bind-mount source for live reload.
- Vite internally, nginx in front.
- Seed on first boot (`alembic upgrade` → seed).
- Mail can be blank.
- No TLS. No resource limits.

**`docker-compose.prod.yml` (what the brother uses)**

- No bind mounts of source.
- **No `build:` stanza.** Images come from GHCR, pinned by `IMAGE_TAG` (a git tag, §6.6). The box never compiles anything. (v2)
- `restart: unless-stopped`.
- Memory/CPU limits.
- Log rotation.
- Secrets from an env file **on the host**, not in git.
- Optional `backup` sidecar.

### 7.3 Dockerfiles (intent, not code)

**Backend — multi-stage:** builder venv → runtime non-root `app` user. CMD gunicorn. Worker image same, CMD `arq`.

**Frontend — multi-stage:** `npm ci && npm run build` → copy `dist/` into nginx html.

Never run `npm` in production. Never bake `MAIL_PASSWORD` or `SECRET_KEY` into an image layer.

### 7.4 Networking

Internal Docker network `northstar`. Only nginx publishes `80/443`.

| Path | Upstream |
|---|---|
| `/` | SPA (`index.html` fallback) |
| `/api/` | backend |
| `/healthz` | backend |
| `/media/photos/…` (v2) | MinIO `photos` bucket, **behind nginx `auth_request` → `GET /api/v1/internal/media-auth`**. The subrequest forwards the cookies; the backend validates the access JWT (status `active`, or `admin`) and returns 200/401; nginx then proxies the object. URLs are stable and cacheable (`Cache-Control: private, max-age=300`), so a browse page with 200 thumbnails costs one auth check per image request and zero presigned URLs. |
| `/t/…`, `/u/…` (v2) | backend — tracked-link and unsubscribe redirects (no auth; JWT in the path, §8.6) |

Documents (PDF packets) do **not** go through `/media`; they stay behind `GET /documents/:id/download` → short-lived presigned URL + audit row (+ watermark in P11), because every packet download must be attributable per click.

Postgres, Redis, MinIO are **not** published to the host in prod.

### 7.5 Handoff runbook (Phase 12 — for the brother)

We write this; we do not execute it on his box.

1. Install Docker Engine + Compose plugin on whatever host he picks.
2. Clone the repo — only for the Compose files, `.env.example`, and runbooks. The images come from GHCR; he never builds. `docker login ghcr.io` with a read-only token if the packages are private (§20 Q1).
3. Copy `.env.example` → `.env`. Fill `SECRET_KEY`, brand, `PUBLIC_DOMAIN`, `CORS_ORIGINS`, bootstrap admin, and `IMAGE_TAG=v1.0.0` (or whichever tag we hand him). Mail can wait.
4. `docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
5. `docker compose exec backend python -m app.cli create-admin`
6. Point DNS at the box; enable TLS however he prefers (we document Caddy and nginx+certbot).
7. When the Gmail app password exists: put `MAIL_*` (and `PUBLIC_MAILING_ADDRESS` before any blast) in `.env`, `compose up -d worker backend` to pick it up. No code change.
8. Daily backup sidecar or host cron: `backup.sh`.
9. `curl https://DOMAIN/api/v1/version` tells him what is running; upgrading is “change `IMAGE_TAG`, `pull`, `up -d`.”

Rollback = previous `IMAGE_TAG` + `pull` + `up -d` (plus the `alembic downgrade` named in the release notes, if that release carried a migration). Every Alembic revision has a tested downgrade.

### 7.6 Why not “frontend in Docker, backend bare metal”

Because the worker, Redis, and Postgres *will* drift. Compose is the contract. If it is not in Compose, it does not exist. The brother should never have to install Python.

---

## 8. Roles, auth, and access model

### 8.1 Roles

| Role | Who | Can |
|---|---|---|
| `pending` | Just registered (open form) | Waiting room only. No deals, no map, no docs. Can edit their profile / POF. |
| `client` | Approved cash buyer | Browse, view live deals (price + ARV), download docs, chat, email, save searches, interest / offer / showing. |
| `admin` | Wholesaler / dispo (v2: you and the brother) | Everything the client can, plus CRUD deals (full math), approve/suspend users, CRM notes, inbox, metrics, mailbox status, preview, blasts, offers, showings. |
| `ops` (**deferred, not v1**) | Virtual assistant | Admin read + notes + inbox reply. No delete deal, no role changes, no env-level mailbox. The enum value is reserved; the guards are written so adding it is a one-line change. |

One person, one role in v1. Admins use **Preview as client** (and that preview **must hide rehab / assignment fee / contract clock / lockbox**).

### 8.2 Login wall

```text
Unauthenticated  →  /login, /register, /forgot, legal pages, /api/v1/public/config
pending          →  /waiting
client           →  /app/browse, /app/deals/:id, /app/chat, /app/settings
admin / ops      →  all of /app/*  AND  /admin/*
```

Deep links redirect to login with `?next=`. After login, if `pending`, waiting room. If `client` hitting `/admin`, 403.

If `REQUIRE_ADMIN_APPROVAL=false`, register creates `active` clients and skips `/waiting`. Default is `true`.

### 8.3 Registration policy — **open**

No invite code. Public `/register`.

Form fields:

- Email, password, full name, phone
- Company (optional)
- Markets of interest
- Max purchase price, asset types (SFR, 2–4, land, commercial)
- Proof of funds upload (optional at signup, **encouraged**; admin can still demand it before hitting Approve)
- Accept: non-representation, confidential info, **no daisy-chaining / re-marketing**, independent verification, no unaccompanied entry — recorded as `TermsAcceptance(terms_version, ip)` (v2)
- SMS consent checkbox, unchecked by default, timestamped (v2 — TCPA consent now, Twilio later)
- Lead source: “How did you hear about us?” (v2 — the desk wants to know which channel produces closers)

Admin queue: **Buyers → Pending**. Approve / reject with a note. Approval can send an email once mail env is set (“You’re in.”).

Open register ≠ open inventory. That is the whole point of `pending`.

### 8.4 Session & JWT token model (v2, locked)

Two tokens, two jobs:

| | Access token | Refresh token |
|---|---|---|
| Format | **JWT**, HS256, signed with `SECRET_KEY` | Opaque 256-bit random; only its SHA-256 is stored |
| Lives in | cookie `__Host-access` — `HttpOnly; Secure; SameSite=Lax; Path=/` | cookie `__Secure-refresh` — `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` (`__Secure-` not `__Host-`, because `__Host-` forbids a non-root path) |
| TTL | `ACCESS_TOKEN_TTL_MINUTES` (15) | `REFRESH_TOKEN_TTL_DAYS` (14), sliding on use |
| Verified by | signature + `exp/iat/iss/aud/typ` + **`ver` == cached `users.token_version`** | DB row: exists, not used, not revoked, not expired, family not revoked |
| Revoked by | `ver` bump (instant, every device) or `jti` denylist in Redis (this device only) | `revoked_at` on the family |
| Claims | `sub` (user id), `sid` (refresh family id), `jti`, `typ=access`, `role`, `status`, `ver`, `iat`, `exp`, `iss`, `aud` | — |

Flows:

- **Login** → create a refresh family (`refresh_tokens` row with `family_id`) → issue an access JWT with `sid=family_id` → set both cookies plus a non-HttpOnly `csrf` cookie (§8.5).
- **Refresh** (`POST /auth/refresh`) → hash the presented token → look it up → if `used_at` is already set, **this is reuse: revoke the entire family and return 401** → otherwise mark it used, insert the child row (`parent_id`), issue a new refresh + a new access token carrying fresh `role/status/ver`.
- **Logout** → revoke the family, denylist the current `jti` for its remaining TTL, clear cookies.
- **Logout everywhere / admin revoke / password change / password reset** → revoke all families **and** `token_version += 1`.
- **Approve / suspend / role change** → `token_version += 1`. The next request returns `401 token_stale`; the SPA calls `/auth/refresh` once and retries. A just-approved buyer sees inventory within one round-trip; a suspended one loses it on their very next request — despite a 15-minute token.
- **Frontend**: the TanStack Query fetch wrapper retries once on `401 token_expired` / `401 token_stale` through `/auth/refresh`; a second 401 redirects to `/login?next=`. No token ever touches JavaScript.
- Concurrent sessions allowed (phone + laptop = two families). `GET /auth/sessions` lists them (device label, IP, last used); `DELETE /auth/sessions/:id` revokes one. Admin can revoke all for a user.
- Redis cache of `users.token_version` has a 5-minute TTL and is written through on every bump, so Redis loss degrades to a DB read, never to a stale allow.

Why the refresh token is not a JWT: its whole job is to be single-use and revocable, which needs a database row anyway; a signature adds verification work and nothing else. If a future client needs a self-describing refresh token, issue a JWT whose `jti` is the row id — same table, same rules.

### 8.5 CSRF, cookies, and the `__Host-` prefix (v2)

- Cookies carry ambient authority, so every **mutating** request (`POST/PUT/PATCH/DELETE`) must also carry `X-CSRF-Token` equal to the `csrf` cookie (double-submit), and its `Origin` (or `Referer`) must match `CORS_ORIGINS`. Missing either → `403 csrf_failed`. `GET` never mutates — ever.
- `Authorization: Bearer` requests skip the CSRF check (no cookie involved) and are the path for scripts, API tests, and a future native client.
- `__Host-` prefixed cookies require `Secure`, `Path=/`, and no `Domain`; the browser enforces it, which kills cookie-tossing from sibling subdomains. The access cookie is `__Host-access`. The refresh cookie is path-scoped to `/api/v1/auth`, which `__Host-` forbids, so it uses `__Secure-refresh` (requires `Secure`, allows a path). On plain-http local dev `COOKIE_NAME_PREFIX=` (empty) drops both prefixes; Compose dev sets that.
- `SameSite=Lax` on the access cookie keeps deep links from blast emails working (top-level GET navigations send it); `SameSite=Strict` on the refresh cookie, scoped to `/api/v1/auth`, means it is never sent anywhere else.

### 8.6 Other signed tokens — all JWT, all `typ`-bound, all short (v2)

| `typ` | Purpose | TTL | Single-use | Notes |
|---|---|---|---|---|
| `verify_email` | Link in the verification email | 24 h | yes (`jti` in Redis until `exp`) | Only issued when mail is configured (`REQUIRE_EMAIL_VERIFICATION=auto`) |
| `reset` | Password reset link | 30 min | yes, and bound to `ver` — using it bumps `ver`, which kills any other outstanding reset for that user | `/auth/forgot` answers identically for known and unknown emails; the token is logged (redacted in prod) when mail is blank |
| `track` | Tracked link in a blast / alert email: `GET /t/:token` → log `blast.clicked` → 302 to `/app/deals/:id` | 30 d | no (clicks are events) | Carries `sub`, `deal`, `campaign`. **Never logs the user in**; the login wall still applies |
| `unsub` | One-click unsubscribe: `GET /u/:token` and `List-Unsubscribe` header | 90 d | no | Must work without login — CAN-SPAM. Flips `email_alerts_enabled=false` and records when |
| *(the access JWT)* | nginx `auth_request` on `/media/*` | — | — | Backend returns 200 if the cookie’s access JWT is valid and `status=active` or role is `admin`; nginx proxies the photo from MinIO. No presigned URL per thumbnail |

Every verifier pins `algorithms=["HS256"]`, requires `exp, iat, sub, jti, typ`, checks `iss` and `aud`, allows 30 s leeway, and **rejects a token whose `typ` does not match the endpoint** — a `track` token can never be presented as an access token, and vice-versa. Appendix H has the claim reference and example payloads.

---

## 9. Domain model

Core entities (Postgres). Names are stable; columns grow per phase.

### 9.0 Conventions (v2)

- **Money is integer cents** (`bigint`): `list_price_cents`, `arv_cents`, `rehab_low_cents`, `rehab_high_cents`, `assignment_fee_cents`, `offer_amount_cents`, `emd_cents`. Never float; Python math in `Decimal` or ints only. The API returns cents; the UI formats.
- **Timestamps are `timestamptz` in UTC.** Each `Market` carries an IANA timezone; showing windows, “offers due,” and the contract clock are displayed in market time.
- **Primary keys are UUIDv7**, generated app-side (time-ordered, so indexes and cursors stay cheap).
- **Soft delete** on `User` and `Deal` (`deleted_at`); hard delete is a CLI job for legal requests. Everything else that matters is append-only: `UserNote`, `AuditLog`, `DealStatusHistory`, `DealPriceHistory`, `TermsAcceptance`, `DealAcknowledgment`.
- **Audit diffs**: every admin `PATCH` on a deal or buyer writes `AuditLog.metadata = {field: [before, after]}`. Price history is also materialized in `DealPriceHistory` because the client needs “Reduced $5K” without scanning the audit table.
- `email` is `citext`; phones are stored as `phone_e164` with the raw input kept for display. `pg_trgm` index on address and buyer name/email/phone for admin search.

### 9.1 Identity

- **User** — email (unique, citext), password hash, role, status (`pending|active|suspended|rejected`), name, phone_e164, license_number (admins/agents), avatar, timezone, **token_version** (int — the JWT `ver`, v2), **email_verified_at** (v2), **totp_secret** (encrypted at rest, P11), **sms_consent_at** (v2), **deleted_at** (v2), created_at, last_login_at, approved_at, approved_by.
- **RefreshToken** (v2) — id, user_id, **family_id**, token_hash (sha256), parent_id, issued_at, expires_at, used_at, revoked_at, ip, user_agent, device_label. Index (user_id, family_id). Rows 30 days past expiry are pruned nightly.
- **TermsAcceptance** (v2) — user_id, terms_version, ip, user_agent, accepted_at. One row per version; `TERMS_VERSION` in env forces re-acceptance.
- **BuyerProfile** — user_id, company, proof_of_funds_url, funds_verified (bool), funds_verified_by/at, max_price_cents, min_price_cents, beds_min, asset_types[], markets[], buy_box notes, preferred_contact (`call|text|email|chat`), **tier** (`A|B|C`, default `C`, v2), **tags[]** (`serious`, `closed-with-us`, `daisy-chainer`, `tire-kicker`, free-form — v2), **lead_source** (`website|referral|facebook|import|other`, v2), **closed_count**, **flake_count** (v2), **do_not_contact** (bool + reason), **email_alerts_enabled** (default true), **assigned_admin_id** (v2).
- **ImportedBuyer** (v2, P7) — the pre-approval list: email (citext), phone_e164, name, tier, tags[], markets[], max_price_cents, source_file, imported_by, imported_at, **claimed_user_id**. On register, a matching email (or phone) auto-activates the account and copies the buy box; the admin sees “imported → claimed.”
- **UserNote** — admin-only CRM notes on a user. author_id, body, created_at. Not visible to the client. Append-only.
- **Notification** (v2) — user_id (admin or buyer), type (`registration.new`, `offer.new`, `offer.countered`, `showing.rsvp`, `showing.confirmed`, `chat.new`, `mail.unmatched`, `deal.alert`, `deal.price_drop`, `deal.gone`, `contract.expiring`, …), payload jsonb, read_at, created_at. Drives the bell badge for admins and the in-app alert feed for buyers.
- **AuditLog** — actor_id, action, entity_type, entity_id, ip, user_agent, metadata jsonb (before/after diffs on edits).

### 9.2 Inventory

- **Market** — name (`Dallas`), state, center lat/lng, zoom, is_active, timezone.
- **Deal** — market_id, status, list_price_cents, address1, city, state, postal_code, lat, lng, beds, baths, sqft, lot_sqft, year_built, occupancy, access, property_type, description, investor_highlights jsonb, **arv_cents**, **rehab_low_cents**, **rehab_high_cents**, **assignment_fee_cents**, hud_fmr_cents, **video_url** (v2 — YouTube / Vimeo / Matterport, hosts from `VIDEO_EMBED_HOSTS`), **offers_due_at** (v2 — client-visible “highest & best by”), **early_access_until** (v2, P9 — before this only tier-A buyers see it), **deal_structure** (v2 — `assignment|double_close|novation`, admin-only), **contract_executed_at / option_period_ends_at / contract_close_by** (v2 — the contract clock, admin-only), **lockbox_code** (v2 — admin-only, never serialized to a client), **jv_partner_name / jv_partner_phone / jv_partner_email / jv_fee_split_pct** (v2 — admin-only), **assigned_admin_id**, cover_photo_id, published_at, created_by, updated_at, **deleted_at**.
- **DealPhoto** (sort_order, is_cover, variants `thumb|card|full` as WebP, EXIF stripped), **DealDocument** (kind `packet|comps|tax|title|survey|other`, download_count), **DealStatusHistory** (from, to, reason, actor, at), **DealPriceHistory** (v2 — old_cents, new_cents, actor, at), **Comp** (v2, optional — structured comps behind the ARV: address, sold_price_cents, sold_at, sqft, distance_mi, source).
- **Notice** — global, per-state, or per-market accordion copy, **versioned** (`notice_version`, v2) so an acknowledgment can reference exactly what the buyer saw. Seed includes the Texas equitable-interest disclosure (§15.4).

**Visibility rule (enforced in schema layer):**

| Field | Client (`DealPublic`) | Admin (`DealAdmin`) |
|---|---|---|
| list_price | yes | yes |
| arv | yes | yes |
| rehab_low / rehab_high | **no** | yes |
| assignment_fee | **no** | yes |
| computed MAO | **no** | yes (display helper only) |
| hud_fmr / est. rent | no (v1) — keep internal unless we reopen | yes |
| occupancy, access | yes | yes |
| offers_due_at, video_url, price reductions (v2) | yes | yes |
| contract_* dates, deal_structure, lockbox_code, jv_* (v2) | **no** | yes |
| early_access_until (v2) | only as an “Early access” chip, and only to tier-A | yes |
| internal notes | no | yes |

MAO helper (admin only): `ARV * 0.70 - rehab - assignment_fee`. Never shown as a promise. Never sent to clients. The CI denylist (§6.5, §17) covers every “no” row above.

### 9.3 Engagement

- **SavedDeal**, **SavedSearch**, **DealView**, **Interest** — as in v1.
- **ContactEvent** (v2) — user_id, deal_id, kind (`call_clicked|email_compose_opened|chat_opened`), at. Cheap signal the desk loves: “three buyers tapped Call on this deal today.”
- **DealAcknowledgment** (v2) — user_id, deal_id, notice_version, ip, accepted_at. Required before an offer on any deal whose market state requires a wholesaler disclosure (Texas equitable-interest, §15.4).
- **Offer** — deal_id, user_id, amount_cents, emd_cents, close_days, funding (`cash|hard_money|private|other`), inspection_days (default 0 — as-is), title_company_pref, pof_document_id, message, **status** (`submitted|countered|accepted|backup|rejected|withdrawn|expired` — Appendix F, v2), **rank** (backup order, v2), counter_amount_cents, counter_note, **is_late** (submitted after `offers_due_at`, v2), decided_by / decided_at, idempotency_key.
- **ShowingWindow** (v2) — deal_id, starts_at, ends_at, capacity, host_admin_id, notes (“meet at the curb, bring your contractor”), status (`open|full|cancelled|done`). The group showing the desk actually runs.
- **ShowingRsvp** (v2) — window_id, user_id, status (`requested|confirmed|declined|attended|no_show`), party_size. Individual **Showing** requests remain for deals with no window (admin proposes a time).
- **Outbox** (v2) — id, kind (`mail.send`, `notification.push`, `blast.recipient`, `alert.deal`), payload jsonb, attempts, next_attempt_at, sent_at, dead_at. Written in the **same transaction** as the domain change; the ARQ worker drains it with exponential backoff. If Redis or the worker dies, nothing is lost — Redis is the trigger, Postgres is the ledger.
- **BlastCampaign** (v2) — deal_id (nullable), created_by, subject, body_template, segment jsonb (markets, tiers, tags, max_price, excludes do-not-contact / pending / unsubscribed), status (`draft|queued|sending|paused|done`), total, sent, clicked, **estimated_finish_at** (derived from `MAIL_DAILY_LIMIT` and `MAIL_RATE_PER_MINUTE`). **BlastRecipient** — campaign_id, user_id, outbox_id, sent_at, clicked_at, error, bounced.

### 9.4 Messaging

- **Thread** — subject, deal_id (nullable), created_by, channel (`chat|email|mixed`; `sms` reserved in the enum for a later Twilio phase so that migration is one line — v2).
- **ThreadParticipant**, **Message**, **MessageAttachment**
- **MailboxConfig** — not a user-connected OAuth row. Runtime reads `MAIL_*` from env. We still persist `last_imap_uid`, `last_sync_at`, `status` in a singleton `mailbox_state` table so the admin page can show “last synced 2m ago” / “not configured”.
- **EmailLink** — message_id ↔ IMAP UID / Message-ID header. Dedup.

### 9.5 Metrics events

- **Event** — `deal.viewed`, `doc.downloaded`, `chat.started`, `offer.submitted`, `contact.call_clicked`, `blast.sent`, `blast.clicked`, `showing.rsvp`, `deal.price_dropped`, `contract.expiring`, … Postgres is enough through Phase 10.

---

## 10. Feature catalog

### 10.1 Must have (parity with New Western screens + login)

- Open email/password register, login, logout, forgot password
- Role gates + pending approval (env-toggle)
- Runtime brand on login, header, footer, emails (`/public/config`)
- Markets list + “Your Market” selector
- Sort: price asc/desc, newest, sqft, status
- Split browse: **OSM map** + cards, responsive (stack on mobile)
- Map: Map / Satellite, cluster, price labels, click pin ↔ highlight card
- Deal card: photo carousel, **list price**, address, beds/baths/sqft (no ARV on the card)
- Deal detail: gallery, status, facts, year built, **list price + ARV**, description, mini-map
- Agent/wholesaler contact strip: phone, email, chat (phone/email from env + admin profile)
- Document packet + individual docs (authenticated download)
- Notices & disclosures accordion + state notice links
- Settings: profile, password, buying criteria, notification prefs
- Footer: privacy, disclosures, “do not sell,” copyright year, legal name from env

### 10.2 Wholesaler desk

- Inventory CRUD (create/edit/unpublish/delete, photo + document upload, status machine)
- **Admin-only fields:** rehab range, assignment fee, MAO helper, HUD FMR, internal notes
- Duplicate deal / coming soon → available
- Buyer list: pending / active / suspended, search, filters
- Approve / reject with note (email when mail is configured)
- CRM notes on a buyer (internal, append-only)
- Proof-of-funds on the buyer record
- “Who viewed this deal” and “which deals this buyer opened”
- Unified inbox: in-app chat + Gmail IMAP threads
- Reply from admin inbox (SMTP + local thread)
- Offer inbox + counters
- Showing calendar (list in v1)
- Metrics
- Preview as client (**must not leak desk fields**)
- Audit log
- Mailbox status page (configured / sandbox / last IMAP error) — no OAuth button

### 10.3 Extra features a working wholesaler will actually use

| Feature | Why a wholesaler cares | Phase |
|---|---|---|
| **Buy box matching** | New Dallas 3/2 under $120k auto-notifies matching buyers | 9 |
| **Deal alerts** | Email/chat: “new in your market” / price drop | 9 |
| **Watchlist** | Buyer stars a deal, gets status-change ping | 4 |
| **Interest button** | Lower friction than a full offer; admin sees heat | 8 |
| **Offer + POF attach** | Separates window-shoppers from closers | 8 |
| **Showing requests** | Legal: no unaccompanied entry; creates a work queue | 8 |
| **Occupancy / access badges** | “Drive-by only” vs “lockbox” prevents wasted trips | 2 |
| **Investor strip (client)** | **List price + ARV** only | 4 |
| **Investor strip (admin)** | + rehab, assignment, MAO, HUD FMR | 2 / 4 |
| **Status pipeline** | Available → Pending → Assigned → Closed | 2 |
| **Days on market** | Aging inventory kills assignment fees | 10 |
| **Dead-deal reason** | “Seller kicked”, “title”, “buyer flake” | 10 |
| **Blast to matching buyers** | One click from deal page, uses SMTP | 9 |
| **Do-not-contact / pause** | Buyer asked to stop; still in CRM | 7 |
| **Internal deal notes** | “Foundation issue, don’t promise X” | 2 |
| **Photo EXIF strip + compress** | Storage + privacy (GPS in phone photos) | 2 |
| **Activity timeline on buyer** | Views, chats, offers, showings | 7 |
| **CSV export of buyers** | Wholesalers live in spreadsheets too | 7 |
| **Saved map viewport per market** | Dallas default zoom isn’t Gainesville | 3 |
| **Runtime brand / domain** | Name still in the works | 0 / 1 |
| **Sandbox mail** | Brother can deploy before the 16-char password exists | 6 |
| **Gmail app-password runbook** | How to mint it on a 2FA Google account | 6 / 12 |
| **OSM attribution** | Required by OSM tile usage policy | 3 |
| **Preview-as-client field audit** | Catch rehab leaking into the client serializer | 4, 11 |

### 10.4 Explicitly later (not v1)

- Native iOS/Android
- Two-way SMS (Twilio)
- Automated underwriting / AVMs
- Public SEO landing pages for each address
- Multi-company / white-label (env brand is enough for one shop)
- Buyer-to-buyer marketplace
- e-sign assignment contracts
- Accounting / assignment-fee invoicing
- Google Maps / Google Earth
- Gmail OAuth (app password is the v1 path; OAuth is an upgrade if Google kills app passwords)
- Invite-only mode (we already have `REQUIRE_ADMIN_APPROVAL`; invite codes are later)
- PWA install + Web Push for buyers (“new deal in your buy box” on the lock screen) — v1.1, the notification model in v2 already stores what push would deliver
- “Recently assigned” social-proof gallery (city + price + days-to-assign, address masked) — v1.1
- Buyer-facing closing checklist / deal room after acceptance — v1.1

### 10.5 v2 additions — what a dispo desk actually needs, and how each is built

Added after a pass through the design as a working wholesaler. Each row names the phase it lands in so nothing here is “later, maybe.”

| Feature | Why the desk cares | How we build it | Phase |
|---|---|---|---|
| **Buyer list import + pre-approval** | The shop already has years of buyers in a spreadsheet. Day-one value is that list, not an empty CRM. | `POST /admin/users/import` (CSV → preview → commit) into `ImportedBuyer`. Register with a matching email/phone → auto-`active`, buy box copied, tier/tags carried. Optional “claim your account” blast once mail exists. Bounces from the first blast feed back as `bounced`. | 7 |
| **Buyer tiers + early access** | A-list buyers (POF verified, closed before) get the deal first; it rewards closers and keeps them loyal. | `tier` on `BuyerProfile`; `early_access_until` on `Deal` (= `published_at + EARLY_ACCESS_DEFAULT_HOURS`, editable per deal). The `DealPublic` query filters by tier until then; card chip “Early access.” Alerts go to tier-A first, the rest at expiry. | 9 |
| **Offers due (“highest & best”)** | Deadlines create urgency and stop the phone ringing for a week. | `offers_due_at` on `Deal`; countdown on card and detail; offers after it are accepted but flagged `is_late`. | field 2 · UI 3/4 · flag 8 |
| **Ranked backup offers + EMD** | The first accepted buyer flakes often enough that a backup list is the business. EMD separates closers from talkers. | Offer status machine (Appendix F). Accepting one offer prompts the admin to rank the rest `backup` or `rejected`; every change notifies the buyer. Offer form captures amount, EMD, close days, funding, inspection days (default 0), POF. | 8 |
| **Group showing windows** | “Saturday 10–11, meet at the curb” is how showings run; twenty individual appointments is how they don’t. | `ShowingWindow` per deal with capacity; buyers RSVP; admin sees the list; reminder notification the morning of. Deals with `access=drive_by_only` have no windows (P8-T4 stays). Individual requests remain for deals without a window. | 8 |
| **Contract clock** | The seller contract expires. Every day after that costs the fee. The desk needs the red number, not a calendar reminder. | `contract_executed_at`, `option_period_ends_at`, `contract_close_by` (admin-only). Inventory table column “days left,” sorted by urgency, red under 7; nightly `contract.expiring` notification. | fields 2 · dashboard 10 |
| **Price history + “Reduced” badge** | A drop is the best re-marketing hook there is. | `DealPriceHistory` written on every list-price change; client badge “Reduced $5K”; watchers get a `deal.price_drop` alert. | 2 · 4 · 9 |
| **Deal structure / JV fields** | Assignment vs double close vs novation changes the paperwork; JV deals need the partner and the split on the record. | Admin-only columns. Never serialized to clients; in the denylist. | 2 |
| **Video walkthrough** | Buyers buy sight-unseen off a video; it cuts showing traffic in half. | `video_url` sanitized against `VIDEO_EMBED_HOSTS`; iframe on the deal page; CSP `frame-src` allowlists the same hosts. | 4 |
| **Cover photo + ordering** | The first photo is the click. | `sort_order`, `is_cover` on `DealPhoto`; drag-to-order in the editor. | 2 |
| **Lockbox code (admin-only)** | It has to live somewhere that isn’t a text thread. | Column on `Deal`, denylisted, audit-logged on read. Client reveal is *not* in v1 (no unaccompanied entry). | 2 |
| **Texas equitable-interest acknowledgment** | Texas requires a wholesaler to disclose, before contract, that they hold an equitable interest and not title (§15.4). A checkbox with a timestamp is cheap insurance. | Versioned `Notice` per state; `DealAcknowledgment` required before `POST /offers` on deals in a state with a required notice → `409 acknowledgment_required` otherwise. Copy reviewed by counsel (§20 Q6). | notice 4 · gate 8 |
| **Versioned terms** | Confidentiality and no-daisy-chain terms only help if you can prove the buyer agreed to *that* version. | `TermsAcceptance`; `TERMS_VERSION` bump forces re-acceptance at next login. | 1 |
| **Per-viewer watermark on downloads** | A packet forwarded to another wholesaler is traceable if it has the buyer’s email on every page. | `pypdf` + `reportlab` overlay (email + timestamp, diagonal, 15 % opacity) at download; cached per (doc, user) 24 h; `WATERMARK_DOWNLOADS` env. | 11 |
| **Tags, lead source, closed/flake counts** | The desk remembers who closes and who wastes Saturdays; the system should too. | Columns on `BuyerProfile`; filters in the Buyers tab; blast segments can target tags. | 7 |
| **Duplicate buyer detection** | Suspended buyers re-register with a new email and the same phone. | On register, match `phone_e164` and normalized email against users + imports; admin sees “possible duplicate of …” in the pending queue. | 7 |
| **Contact-click tracking** | Knowing who tapped Call on which house is half the follow-up list. | `ContactEvent` from the `tel:` / email / chat buttons; shown on the buyer timeline and the deal’s activity. | 4 · 10 |
| **Notification center** | Two admins on phones need one bell, not six tabs. | `Notification` rows from every desk event; bell badge; buyer side gets alerts (new match, price drop, status change, showing confirmed, offer countered). Optional email digest to admins. | 5 (model) · 8/9 (events) |
| **Outbox** | A blast or an approval email must not vanish because Redis restarted. | `Outbox` table written in the same transaction; worker drains with backoff; dead-letter visible on the mailbox status page. | 5 · 6 |
| **Blast campaigns (tracked, capped, compliant)** | The blast is the product for the desk — and a Gmail account caps out at a few hundred a day. | `BlastCampaign` + `BlastRecipient`; `track` JWT links log clicks per buyer; `unsub` JWT + `List-Unsubscribe`; footer with `PUBLIC_MAILING_ADDRESS`; throttle + daily cap from env; UI shows `estimated_finish_at` before send. | 9 |
| **“This one’s gone” auto-message** | When a deal goes `assigned`, every interested buyer gets told — with the three closest live deals. | Status transition → `Outbox` rows for interested/watching buyers; similarity = same market, ±25 % price, same property type. | 9 |
| **Sessions + admin 2FA** | The admin login is the mailbox, the inventory, and the list. | `GET/DELETE /auth/sessions`; TOTP enrollment + `ADMIN_REQUIRE_2FA`; recovery codes printed once. | 1 · 11 |
| **Client filters** | Buyers asked for price/beds/type filters before they asked for anything else. | Query params on `GET /deals` and `/map/pins`: `price_min, price_max, beds_min, property_type, occupancy, status`; mirrored in the URL. | 3 |
| **Admin search** | “Find 916 Eldridge” / “find the guy with the 214 number.” | `pg_trgm` indexes; one search box per admin tab. | 2 (inventory) · 7 (buyers) |

---

## 11. Client experience

### 11.1 Browse (primary screen)

Layout, desktop:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  {PUBLIC_BRAND_NAME}    Browse        Settings        Log out            │  charcoal + gold
├──────────────────────────────────────────────────────────────────────────┤
│  [avatar] Jane Buyer   ·  approved            [chat] [phone] [email]     │
│  Market: [ Dallas ▾ ]                     Sort: [ Price low → high ▾ ]   │
├────────────────────────────────────┬─────────────────────────────────────┤
│  OSM MAP                           │  CARD  CARD                         │
│  Map | Satellite                   │  CARD  CARD                         │
│  clusters + $70K pins              │  …                                  │
│  “© OpenStreetMap contributors”    │                                     │
└────────────────────────────────────┴─────────────────────────────────────┘
│  © year  {LEGAL_NAME}  Privacy  Disclosure  CA privacy  Do not sell      │
```

Behavior:

- Changing market refetches deals + pins.
- Filters (v2): price range, beds min, property type, occupancy, status — as query params mirrored in the URL, applied to both the card list and `/map/pins`.
- Cards show “Offers due Fri” and “Reduced” badges when those fields are set (v2).
- Map move does **not** filter the list in v1. Optional “search this area” is Phase 11.
- Click pin ↔ scroll/highlight card. Click card (non-carousel) → deal page.
- Cards show **list price only**, not ARV (scan speed). ARV lives on the detail page.
- Mobile: cards first, a “Map” fab opens a full-screen map sheet.
- OSM attribution visible. Tile usage policy is not optional.

### 11.2 Deal detail

- Back to Browse (keeps market + sort in the URL).
- Quilted gallery + View All lightbox.
- Status chip.
- **List price** (hero) and **ARV** (secondary, labeled “ARV” so it is not confused with asking).
- Year, chips, occupancy, access.
- **Offers due** countdown (market time) when set; **“Reduced $5K”** badge when the price dropped; **Early access** chip for tier-A during the window. (v2)
- Video walkthrough embed when `video_url` is set (allowlisted hosts only). (v2)
- Description + Show more.
- Primary CTA: Call · Email this deal · Chat about this deal · I’m interested · Request showing / **RSVP to a showing window** · Make an offer. Every tap logs a `ContactEvent`. (v2)
- Offer flow: if the deal’s state requires a wholesaler disclosure, the equitable-interest notice is shown and must be acknowledged (once per deal) before the offer form opens. (v2)
- Documents, mini-map (OSM), notices.

There is **no** rehab row, **no** assignment-fee row, **no** MAO, **no** contract dates, **no** lockbox code on this page.

### 11.2a Notifications (client, v2)

Bell in the chrome. Feed: new deal in your buy box, price drop on a watched deal, status change on a watched deal, showing confirmed / cancelled, offer countered / accepted / moved to backup. Each item deep-links. Email copies go out only if `email_alerts_enabled` and mail is configured; unsubscribe from any email flips the flag without a login.

### 11.3 Chat (client)

- Global icon opens thread list.
- From a deal, “Chat” opens or creates the deal thread with the address as subject and a deep-link card at the top.
- Text + optional image. Size cap.
- Unread badge.

### 11.4 Email (client)

- “Email” opens a compose modal: To = shop mailbox (from env, read-only), Subject prefilled `Re: 916 Eldridge St, Gainesville, TX`.
- Submitting calls the API; worker sends via SMTP as `MAIL_FROM`.
- If mail env is empty: API returns `409 mailbox_not_configured` and the UI says “Call or chat us — email is being set up.” Chat and `tel:` still work.
- Copy-to-clipboard of the shop address as fallback when configured.

Phone icon: `tel:` to `PUBLIC_SUPPORT_PHONE` (env) or the assigned admin’s number.

---

## 12. Admin experience

Admin chrome: same brand from config, extra **Admin** tab. Two-pane: **Preview** | **Desk**.

### 12.1 Tabs

1. **Preview** — exact client browse (coming_soon toggle). Preview uses `DealPublic`. If rehab, a contract date, or a lockbox code is visible here, it is a bug.
2. **Inventory** — table + filters + search. **Contract clock column (“days left”), sorted by urgency** (v2). Create/edit drawer with **full math**, deal structure, JV fields, lockbox code, offers-due, video URL. Photo manager (cover + drag order). Document manager. Internal notes. Status changes. Price history drawer.
3. **Buyers** — pending approvals (this is the daily queue now that register is open) with **duplicate flags** and **unverified-email badges**; active list with **tier / tags / lead-source filters**; **CSV import** with preview (v2); profile, POF, buy box, notes, activity, message/email this buyer. Suspend. Revoke sessions.
4. **Inbox** — unified chat + IMAP. Filters: unread, deal, buyer, channel. Reply box. Link unmatched inbound to a deal/buyer. Dead-letter outbox rows surface here too (v2).
5. **Pipeline** — interests, **offers ranked with accept / counter / backup / reject** (v2), **showing windows with RSVP lists** (v2), individual showing requests.
6. **Blasts** (v2) — compose from a deal or standalone, pick a segment (markets, tiers, tags, max price), see the recipient count and the **estimated finish time under the daily cap**, send or schedule. Per-campaign sent / clicked / bounced.
7. **Metrics**
8. **Settings** — default market, disclosure copy, **read-only brand preview** (tells admin “change `PUBLIC_BRAND_*` in .env”), **mailbox status** (configured / sandbox / last error / last UID / **sent today vs cap** / dead letters), **my sessions + 2FA enrollment** (v2). No “Connect Google” button.

A bell with a badge sits in the admin chrome (v2): new registration, new offer, RSVP, new chat, unmatched email, contract expiring.

### 12.2 Inventory editor (minimum fields)

Address (Nominatim geocode on save), market, status, **list price**, **ARV**, beds, baths, sqft, year, occupancy, access, description, **rehab low/high (admin)**, **assignment fee (admin)**, HUD FMR (admin), tags, photos (cover + order), documents, internal notes, publish toggle, and (v2) offers-due date, video URL, deal structure, contract executed / option ends / close-by dates, lockbox code, JV partner + split, assigned admin, early-access hours.

Refuse publish without: list price, ARV, address, market, ≥1 photo, lat/lng. Warn (not block) on publish without `contract_close_by` — the clock is the point.

### 12.3 Buyer record

Header: name, phone, email, status, **tier**, **tags**, lead source, last seen, POF badge, **email-verified badge**, closed / flake counts (v2).  
Tabs: Profile / Notes / Activity (views, contact clicks, chats, offers, RSVPs, blast clicks) / Deals touched / Messages / **Sessions** (v2).  
Notes are timestamped, author-stamped, immutable.

---

## 13. Chat, email, and Gmail (SMTP + app password)

OAuth is **out of v1**. The stakeholder will later put an address + **16-character Google App Password** in `.env`. Until then, mail is sandboxed and the rest of the product works.

### 13.1 Goals

- Client can chat in-app, any time, about a house or generally. **Chat never depends on mail env.**
- Client can email; when `MAIL_*` is set, that email **actually arrives in Gmail**.
- Admin can answer from **either** Gmail **or** the admin inbox; IMAP brings replies back.
- If the wholesaler is at a showing and only has the Gmail app, nothing is lost.
- Brother can deploy the stack before mail is ready.

### 13.2 How Gmail app passwords work (runbook, not code)

1. Google account (personal or Workspace) has **2-Step Verification** on.
2. Google Account → Security → App passwords → generate one for “Mail”.
3. Google shows a **16-character** password (often displayed as 4×4). That is `MAIL_PASSWORD`.
4. `MAIL_USERNAME` / `MAIL_FROM` = the full address.
5. SMTP: `smtp.gmail.com:587` STARTTLS. IMAP: `imap.gmail.com:993` SSL.
6. Drop values in `.env`, recreate `backend` + `worker`. No Google Cloud project, no OAuth consent screen, no app verification.

If Google later kills app passwords, the upgrade path is Gmail API OAuth (a new phase). Do not build that now.

### 13.3 Sending

Client hits `POST /threads/{id}/messages` with `via=email` or `POST /mail/outbound`.

Worker:

1. If `MAIL_PASSWORD` empty → write `.eml` to MinIO `mail-sandbox/`, insert `Message(via=email_out, sandbox=true)`, return success with `sandbox: true`.
2. Else SMTP send as `MAIL_FROM`. Subject includes a stable token (`[NS-{thread_short_id}]`) so IMAP can thread replies even without Gmail API thread ids.
3. Store `EmailLink` (Message-ID header, IMAP UID once seen).

### 13.4 Inbound (IMAP)

Worker every `MAIL_POLL_SECONDS` (default 60):

1. If mail not configured, no-op.
2. IMAP IDLE when possible, else poll INBOX since last UID.
3. Skip messages we sent (EmailLink / our `Message-ID`).
4. Match to a Thread: our `[NS-…]` token, In-Reply-To, or from-address → known buyer email.
5. If unmatched: create a Thread with `deal_id=null`, flag admin to link.
6. Insert `Message(via=email_in)`. Unread for admin.

Dedup on RFC Message-ID. Unique constraint.

### 13.5 Chat vs email

| | Chat | Email |
|---|---|---|
| Transport | our API, Postgres | SMTP out / IMAP in |
| Depends on `.env` mail | no | yes (else sandbox) |
| Client UI | messenger | compose modal |
| Admin UI | same inbox, channel badge | same inbox, channel badge |
| Offline wholesaler | they need the site | Gmail app |

A thread becomes `mixed` when both happen on the same deal+buyer.

### 13.6 Failure modes

- Mail env empty → chat works; email CTA explains the gap; admin banner “Mailbox not configured (sandbox).”
- Bad app password → SMTP/IMAP error recorded on `mailbox_state`; banner “Mailbox auth failed — check MAIL_PASSWORD”; chat still works; outbound queued with retry then dead-letter.
- Worker down → chat still works; outbound sits in Redis.
- Duplicate inbound → unique Message-ID.
- Buyer emails from a different address → unmatched thread, admin links it.
- Gmail “less secure” / app-password revoked → same as bad password.

### 13.7 What we are not building

- Google Cloud OAuth client
- `gmail.readonly` / `gmail.send` scopes
- Admin “Connect Gmail” popup
- Per-user mailboxes

### 13.8 Sending limits, the outbox, and compliance (v2)

The part v1 did not say out loud: **a Gmail account behind an app password is a person’s mailbox, not a bulk sender.** Google caps outbound at roughly 500 messages/day for a consumer account and roughly 2,000/day for Workspace (check Google’s current numbers; they move). Blow through it and Google suspends sending for up to 24 hours — which also kills approval emails, reset links, and admin replies.

So:

- **Every outbound email is an `Outbox` row** written in the same transaction as whatever caused it. The worker drains the table; Redis only wakes it up. Restart-safe, dead-letter-visible.
- **Two lanes.** Transactional mail (verify, reset, approval, offer countered, showing confirmed, admin reply) is lane 1 and always goes first. Blast and alert mail is lane 2, throttled to `MAIL_RATE_PER_MINUTE`, and stops for the day when the combined count reaches `MAIL_DAILY_LIMIT` (default 450 — under the consumer cap with headroom for lane 1).
- **The UI is honest.** A blast to 1,400 buyers under a 450/day cap is a three-day blast. The composer shows `estimated_finish_at` before the admin hits Send, and the mailbox status page shows “sent today 212 / 450.”
- **CAN-SPAM on every lane-2 email:** physical mailing address from `PUBLIC_MAILING_ADDRESS` in the footer, working one-click unsubscribe (`unsub` JWT + `List-Unsubscribe` / `List-Unsubscribe-Post` headers), honest subject, and the shop’s real address as `From`. The composer refuses to send a blast while `PUBLIC_MAILING_ADDRESS` is blank.
- **Bounces feed back.** IMAP sees delivery failures; the poller matches them to `BlastRecipient` rows and flags the buyer. Three hard bounces → `email_alerts_enabled=false` automatically, with a note. An imported list that is 30 % dead would otherwise burn the mailbox’s reputation on its first blast — so the first blast to an imported list is sent to tier-A only, then expanded.
- **`MailProvider` is a protocol** with two implementations in v1: `SmtpProvider` (Gmail app password) and `SandboxProvider` (`.eml` to MinIO). When the list outgrows Gmail, a third — Postmark / SES / Resend with a shop domain — slots in without touching the outbox, the composer, or the templates. That is the upgrade path, and it is a phase, not a rewrite.
- **Deliverability when a domain exists:** Workspace on the shop’s domain with SPF, DKIM, and DMARC set — documented in `docs/runbooks/gmail-app-password.md` as the step after the app password.

---

## 14. API surface

All under `/api/v1`. Auth cookie on everything except health, public config, login, register, forgot.

### Public (no auth)
- `GET /public/config` → brand name, tagline, logo, support phone, support email, footer legal name, primary state, `mail_configured: bool`, `terms_version`
- `GET /healthz`
- `GET /version` → `{tag, commit, built_at}` (v2)
- `GET /t/:token` → verify `track` JWT, log `blast.clicked`, 302 to the deal (login wall applies) (v2)
- `GET /u/:token` → verify `unsub` JWT, disable email alerts, confirmation page (v2)

### Auth
- `POST /auth/register` (body includes `terms_version`, `sms_consent`, `lead_source`)
- `POST /auth/login` → sets `__Host-access`, `__Secure-refresh`, `csrf` cookies
- `POST /auth/logout`
- `POST /auth/refresh` → rotation + reuse detection (§8.4)
- `POST /auth/forgot` / `POST /auth/reset` (`reset` JWT)
- `POST /auth/verify-email` (`verify_email` JWT) / `POST /auth/verify-email/resend` (v2)
- `GET  /auth/me` → user, profile, `terms_accepted: bool` (drives the re-accept modal)
- `POST /auth/accept-terms` (v2)
- `GET  /auth/sessions` / `DELETE /auth/sessions/:id` / `POST /auth/sessions/revoke-all` (v2)
- `POST /auth/2fa/enroll` / `POST /auth/2fa/confirm` / `POST /auth/2fa/verify` / `POST /auth/2fa/disable` (P11)
- `GET  /internal/media-auth` → 200/401 for nginx `auth_request`; not routable from outside nginx (v2)

No `/auth/invite`. No `/mail/gmail/connect`.

### Markets & deals (client) — **DealPublic**
- `GET /markets`
- `GET /deals?market_id&sort&status=available,pending&price_min&price_max&beds_min&property_type&occupancy` (v2 filters)
- `GET /deals/:id`  ← 404 if unpublished, soft-deleted, or still in another tier’s early-access window; body has `list_price_cents`, `arv_cents`, `offers_due_at`, `video_url`, `price_history` (reductions only), **not** rehab/fee/contract/lockbox/jv
- `GET /deals/:id/photos` → stable `/media/photos/...` URLs (v2)
- `GET /deals/:id/documents`
- `GET /documents/:id/download` → signed URL, 60s, audit (+ watermark from P11)
- `POST /deals/:id/saves` / `DELETE`
- `GET /map/pins?market_id&…same filters` → price, status, badges only
- `GET /deals/:id/showing-windows` (v2)
- `POST /deals/:id/acknowledge` → `DealAcknowledgment` for the current notice version (v2)
- `POST /deals/:id/contact-events` → `{kind}` (v2)

### Chat & mail
- `GET/POST /threads`
- `GET/POST /threads/:id/messages`
- `POST /mail/outbound` → accepted into the outbox; `sandbox: true` when mail env is empty
- `GET /mail/status` (admin) → configured, last_sync, last_error, `sent_today`, `daily_limit`, `dead_letters`

### Client extras
- `POST /deals/:id/interests`
- `POST /deals/:id/offers` (Idempotency-Key; `409 acknowledgment_required` where a notice applies; `is_late` set server-side)
- `GET  /me/offers` / `POST /offers/:id/withdraw` (v2)
- `POST /deals/:id/showings` (individual request, deals without a window)
- `POST /showing-windows/:id/rsvp` / `DELETE` (v2; `409 window_full`)
- `PATCH /me/profile`
- `PUT  /me/buy-box`
- `GET  /me/notifications` / `POST /me/notifications/:id/read` / `POST /me/notifications/read-all` (v2)

### Admin — **DealAdmin**
- `GET/POST /admin/deals` (search, contract-clock sort)
- `PATCH/DELETE /admin/deals/:id` (DELETE = soft delete; `GET /admin/deals?deleted=true` is the trash)
- `POST /admin/deals/:id/photos` / `PATCH /admin/deals/:id/photos/order` (v2)
- `POST /admin/deals/:id/documents`
- `GET  /admin/deals/:id/price-history` / `GET /admin/deals/:id/activity` (v2)
- `POST /admin/deals/:id/status` → `{to, reason}` writes history, fires “gone” messages on `assigned|closed` (v2)
- `GET/POST /admin/deals/:id/showing-windows` / `PATCH /admin/showing-windows/:id` / `PATCH /admin/rsvps/:id` (v2)
- `GET  /admin/offers?deal_id&status` / `PATCH /admin/offers/:id` → `{status, rank, counter_amount_cents, counter_note}` (v2, Appendix F)
- `GET /admin/users?status=&tier=&tag=&q=`
- `POST /admin/users/:id/approve` / `reject` / `suspend` / `PATCH /admin/users/:id` (tier, tags, do-not-contact, assigned admin) (v2)
- `POST /admin/users/import` → preview; `POST /admin/users/import/:batch/commit` (v2)
- `POST /admin/users/:id/notes`
- `GET /admin/users/:id/activity` / `GET /admin/users/:id/sessions` / `POST /admin/users/:id/sessions/revoke-all` (v2)
- `GET /admin/users/export.csv`
- `GET /admin/inbox`
- `GET /admin/notifications` / read endpoints as client (v2)
- `GET/POST /admin/blasts` / `POST /admin/blasts/:id/send` / `POST /admin/blasts/:id/pause` / `GET /admin/blasts/:id` (v2)
- `GET /admin/metrics/overview`
- `GET /admin/audit`

A contract test **fails the build** if `DealPublic` JSON — or the `/map/pins` payload — contains any of the keys `rehab_low_cents`, `rehab_high_cents`, `assignment_fee_cents`, `mao`, `lockbox_code`, `contract_executed_at`, `option_period_ends_at`, `contract_close_by`, `deal_structure`, `jv_partner_name`, `jv_partner_phone`, `jv_partner_email`, `jv_fee_split_pct`, `hud_fmr_cents`.

Errors: RFC 7807 problem+json; `401` bodies carry `code` ∈ `token_expired | token_stale | token_invalid | csrf_failed` so the SPA can decide between refresh and redirect. Pagination: cursor for inbox and notifications, page for deals. Idempotency-Key on `POST /offers`, `POST /mail/outbound`, `POST /admin/blasts/:id/send`.

---

## 15. Security

Treat this as a system that holds **off-market addresses, buyer POF, and a Gmail app password**. That password is equivalent to mailbox takeover.

### 15.1 Application

| Control | How |
|---|---|
| Authn | JWT access token in `__Host-access` (HttpOnly, Secure, SameSite=Lax, 15 min), DB-backed rotating refresh in `__Secure-refresh` (Strict, path-scoped), Argon2id. HTTPS only in prod. §8.4 |
| Token integrity (v2) | HS256 pinned (`algorithms=["HS256"]`), `exp/iat/iss/aud/typ/jti` required, 30 s leeway, `typ` must match the endpoint. `SECRET_KEY` ≥ 32 random bytes; `SECRET_KEY_PREVIOUS` verifies only during rotation and is blanked after `ACCESS_TOKEN_TTL` + the longest one-time-token TTL (90 d for `unsub` — or bump `ver` for everyone and blank it after 24 h) |
| Instant revocation (v2) | `ver` claim vs Redis-cached `token_version`, bumped on suspend / approve / role change / password change / reset / revoke-all. `jti` denylist for single-device logout. Refresh reuse → family revoked |
| Authz | Server-side role **and status** checks on every request. Unpublished / early-access / soft-deleted deals 404 to clients, not 403. |
| Approval gate | `status=active` required for inventory (unless env flips it) |
| Field-level authz | `DealPublic` vs `DealAdmin`. Preview-as-client uses Public. `/map/pins` has its own minimal schema. |
| Media (v2) | `/media/*` behind nginx `auth_request`; photos are never on a public bucket or a guessable CDN URL. Documents presigned 60 s + audited + optionally watermarked per viewer |
| 2FA (v2) | TOTP for admins (`ADMIN_REQUIRE_2FA`), 10 recovery codes shown once, stored hashed. Enrollment requires password re-entry |
| Validation | Pydantic on input; parameterized SQL only; money as ints; `video_url` host allowlist |
| XSS | React escaping; CSP on nginx (`default-src 'self'`; tile hosts allowlisted: `*.tile.openstreetmap.org`, `server.arcgisonline.com`; `frame-src` = `VIDEO_EMBED_HOSTS`) |
| CSRF | SameSite cookies + double-submit `X-CSRF-Token` + Origin check on every mutating route; bearer requests exempt (§8.5) |
| CORS | Explicit origins from `CORS_ORIGINS` |
| Rate limit | Redis: login 5/min/ip, register 10/hour/ip (open register will be probed), forgot 3/hour/email, refresh 30/min/user, mail send 20/hour/user, offers 10/hour/user, `/t/` and `/u/` 60/min/ip |
| Uploads | Allowlist mime **by magic bytes**, size cap from env, random keys, **strip EXIF**, re-encode images (a re-encoded JPEG cannot carry a payload) |
| Signed downloads | Short-lived S3 URLs; no public buckets; per-viewer watermark when enabled |
| Secrets | Env / Docker secrets. `MAIL_PASSWORD` and `SECRET_KEY` never logged (redact filter). `.env` never in image layers. `gitleaks` pre-commit + GitHub push protection (v2) |
| Headers | HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Audit | Admin mutations (with diffs) + document downloads + approve/reject + lockbox reads + session revokes + blasts sent |
| Terms (v2) | Versioned acceptance with IP/UA; Texas equitable-interest acknowledgment per deal before an offer |
| PII | POF is admin-only. CCPA page is real copy |

### 15.2 Mail-specific

- App password only in env / Docker secret, never in the database.
- Worker logs `MAIL_USERNAME` at info, **never** `MAIL_PASSWORD`.
- Disconnect = blank the env vars and recreate containers (no token row to delete).
- Sandbox mode is the default in git so CI never talks to Google.

### 15.3 Infra

- Non-root containers.
- Postgres not published to the internet.
- Regular `pg_dump` off-box (brother’s storage).
- `.env.example` committed; `.env` gitignored.
- Image scans later (Trivy).
- Supply chain (v2): `uv.lock` / `package-lock.json` committed and installed with `uv sync --frozen` / `npm ci`; base images pinned by digest in Dockerfiles; Dependabot weekly; `pip-audit` + `npm audit` in CI; images built only by CI from a tag, never by hand.
- Secrets in GitHub Actions: only `GITHUB_TOKEN` (for GHCR push). CI never holds a Gmail password, a prod `SECRET_KEY`, or the brother’s box credentials. There is nothing to leak.

### 15.4 Legal / product

- Six accordion notices ship in Phase 4.
- “No unaccompanied entry” is a notice **and** a showing workflow.
- Document packet is not a public CDN URL.
- OSM attribution on every map.
- **Texas equitable-interest disclosure (v2).** Texas Property Code §5.086 and Occupations Code §1101.0045 require a person selling an option or assigning a contract interest to disclose to a potential buyer, before contract, that they are selling only an option / assigning an interest and do not hold legal title. We ship the notice per state (`PUBLIC_PRIMARY_STATE=TX` default), show it on the deal page, and require a per-deal acknowledgment before an offer. **The copy and the statutory reading are confirmed by the shop’s attorney or broker before Phase 4 merges** (§20 Q6). Other states with wholesaling rules (e.g. Illinois, Oklahoma, South Carolina, Pennsylvania) get their own notice rows when a market opens there.
- **CAN-SPAM (v2):** physical address in every marketing email, one-click unsubscribe honored immediately, no misleading subjects. Enforced by the composer, not by memory.
- **TCPA (v2):** SMS consent is a separate, unchecked-by-default checkbox with a timestamp, so the future SMS phase has written consent on file.
- **Buyer data:** CCPA page is real copy; “delete my account” anonymizes the user row and keeps audit/offer history under a tombstone id.

---

## 16. Phased delivery

Rules for every phase:

1. Starts from `main` on a `phase/NN-slug` branch, ends with a merged PR and two tags (§6.2, §6.6).
2. Has **automated tests that fail if the slice is broken**.
3. Has a **manual demo script** that a human follows before the PR is approved.
4. Updates `docs/phases/NN-*.md` and `CHANGELOG.md`.
5. Does not start the next phase if the current tests are red — or if the current phase is not merged and tagged.
6. Migrations are part of the phase — exactly one revision per phase PR, downgrade tested.
7. Is built as checkpoint commits (§6.3), each pushed; never as one commit at the end. (v2)
8. Its PR has every box in the template checked; CI is green; the merge is `--no-ff`. (v2)
9. Its images exist on GHCR under `phase-NN` / `v0.NN.0` before the phase is called done. (v2)
10. Any `spike/*` it needed is deleted and summarized in `docs/decisions/`. (v2)

---

### Phase 0 — Platform skeleton (Docker, CI, health)

**Goal:** `docker compose up` yields a green `/healthz`, empty SPA shell with **brand from env**, Postgres reachable, Alembic current, tests run inside Compose. Mail env blank is fine.

**Deliverables**

- Repo layout as in §6
- Backend / frontend / nginx / Compose
- `GET /healthz`, `GET /version` (tag + commit from build args), `GET /api/v1/public/config`
- Alembic empty baseline
- `.env.example` with every knob in §5.6
- Makefile
- Backup script dry-run
- README aimed at the brother: “install Docker, copy env, compose up”
- **GitHub bootstrap (v2):** `.github/workflows/{ci,e2e,infra,release}.yml`, PR template, issue template, `CODEOWNERS`, `dependabot.yml`, `.pre-commit-config.yaml` with `gitleaks`, `CONTRIBUTING.md` (= §6.2–6.8), `CHANGELOG.md`, secret scanning + push protection switched on, branch protection / ruleset on `main` if the plan allows (§20 Q1), first `phase-00` / `v0.0.0` tag producing the first two GHCR images
- `core/security.py` skeleton: JWT encode/decode with pinned algorithm and `typ` check — no routes yet, but the module every later phase imports (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P0-T1 | compose | `docker compose config` is valid |
| P0-T2 | integration | `/healthz` 200 only if Postgres ping works |
| P0-T3 | integration | `/healthz` 503 if `DATABASE_URL` is wrong |
| P0-T4 | unit | settings refuse missing `SECRET_KEY`; refuse a `SECRET_KEY` under 32 bytes |
| P0-T5 | unit | settings boot with `MAIL_PASSWORD` empty |
| P0-T6 | api | `/public/config` returns `PUBLIC_BRAND_NAME` from env; changing env changes the JSON without a frontend rebuild |
| P0-T7 | smoke | frontend build produces `index.html` |
| P0-T8 | integration | `alembic upgrade head` is idempotent |
| P0-T9 | integration | Redis `PING` from backend |
| P0-T10 | ci | a PR with a deliberately failing unit test shows a red required check (and cannot merge, if protection is available) (v2) |
| P0-T11 | ci | pre-commit `gitleaks` blocks a commit containing `MAIL_PASSWORD=abcd efgh ijkl mnop` (v2) |
| P0-T12 | ci | pushing tag `phase-00` publishes `sellstuff-backend` and `sellstuff-frontend` to GHCR; `/version` on the pulled image reports `phase-00` (v2) |
| P0-T13 | ci | `.env.example` ↔ `Settings` sync check fails when a field is added to one and not the other (v2; P12-T4 repeats it on the prod overlay) |
| P0-T14 | unit | `core/security.py` rejects `alg=none`, a wrong `typ`, and an `HS256` token signed with the wrong key (v2) |

**Demo:** compose up, browser shows placeholder brand and “Log in”. Change `PUBLIC_BRAND_NAME`, restart API, header/login title updates. Open the PR, watch CI go green, merge, tag, watch the images appear under Packages.

**Not in this phase:** real login, deals, maps.

---

### Phase 1 — Auth, roles, open register, approval gate

**Goal:** Anyone can register. Nobody sees inventory until approved. Admin can approve.

**Deliverables**

- Users table, `refresh_tokens`, `terms_acceptance` (v2)
- JWT access token + rotating refresh with reuse detection + `ver` revocation + CSRF double-submit + bearer path (§8.4–8.5) (v2)
- Register / login / logout / refresh / me / forgot+reset (`reset` JWT; token logged until mail exists) / verify-email (`auto` — skipped while mail is blank) (v2)
- Roles: pending, client, admin
- Seed admin from `BOOTSTRAP_ADMIN_*`
- Frontend: login, **open register** (no invite field; terms checkbox with version, SMS consent, lead source), waiting room, guards, fetch wrapper with the refresh-once-then-redirect rule, re-accept-terms modal
- Settings → Sessions list + revoke (v2)
- Admin: Buyers list with Approve / Reject (+ unverified badge)
- `REQUIRE_ADMIN_APPROVAL` honored

**Tests**

| ID | Type | Case |
|---|---|---|
| P1-T1 | unit | password hash Argon2 and verify works |
| P1-T2 | api | register without invite succeeds; status `pending` when flag true |
| P1-T3 | api | register with flag false → status `active` |
| P1-T4 | api | pending user cannot `GET /deals` (403) |
| P1-T5 | api | login bad password 401; same message as unknown email |
| P1-T6 | api | refresh rotation: old refresh 401 after use |
| P1-T7 | api | logout kills refresh family |
| P1-T8 | api | non-admin cannot approve |
| P1-T9 | api | admin approve flips to `active` |
| P1-T10 | api | unauthenticated `/auth/me` 401 |
| P1-T11 | api | login rate limit 429 |
| P1-T12 | api | register rate limit 429 |
| P1-T13 | e2e | register → waiting room; admin approves; client loads `/app` shell |
| P1-T14 | e2e | client hitting `/admin` sees 403 |
| P1-T15 | e2e | cookie is HttpOnly; `document.cookie` does not contain the access token |
| P1-T16 | unit | access JWT carries `sub, sid, jti, typ=access, role, status, ver, iss, aud`; `exp − iat` == `ACCESS_TOKEN_TTL_MINUTES` (v2) |
| P1-T17 | api | tampered signature → 401 `token_invalid`; `alg=none` → 401; a `reset` token presented as access → 401 (v2) |
| P1-T18 | api | refresh **reuse**: presenting an already-used refresh revokes the whole family — the newer child token is 401 too (v2) |
| P1-T19 | api | admin suspends a user → that user’s next request with a still-valid access JWT is 401 `token_stale` (v2) |
| P1-T20 | api | approve bumps `ver`; client `/auth/refresh` returns a token with `status=active`; `/deals` then 200 with an empty list (v2) |
| P1-T21 | api | `POST` without `X-CSRF-Token` → 403 `csrf_failed`; same request with `Authorization: Bearer` → 200 (v2) |
| P1-T22 | api | two logins = two families in `/auth/sessions`; deleting one leaves the other working (v2) |
| P1-T23 | api | register without `terms_version` → 422; with it → `terms_acceptance` row has version + ip; bumping `TERMS_VERSION` makes `/auth/me.terms_accepted` false (v2) |
| P1-T24 | unit | `SECRET_KEY_PREVIOUS` verifies a token signed with the old key; new tokens are never signed with it (v2) |
| P1-T25 | integration | mail blank → register skips verification, admin sees “unverified”; mail mocked → Approve is refused (`409 email_unverified`) until `verify_email` token is consumed; the token is single-use (v2) |
| P1-T26 | api | password reset consumes the `reset` token, bumps `ver`, and a second outstanding reset token for the same user is now invalid (v2) |
| P1-T27 | e2e | expired access cookie → SPA silently refreshes and the page renders; revoked family → redirect to `/login?next=` (v2) |

**Demo:** stranger registers, accepts terms, sees waiting room, admin approves, they land on empty browse within one click. Admin suspends them from a second browser; their next click is the login page.

---

### Phase 2 — Inventory as the system of record (admin CRUD)

**Goal:** Admin can create a deal with photos, **list price, ARV, rehab, fee**. Client JSON shows only price + ARV.

**Deliverables**

- Markets + deals + photos + documents + status history + internal notes + **price history** (v2)
- Money as integer cents; UUIDv7 keys; soft delete + admin trash (v2)
- Desk-only columns: deal structure, contract clock dates, lockbox code, JV partner/split; client-visible `offers_due_at`, `video_url`; cover photo + ordering (v2)
- Admin inventory table + create/edit (Nominatim geocode button) + search + contract-clock column
- MinIO upload, **magic-bytes MIME check**, EXIF strip, re-encode, WebP variants (v2)
- nginx `auth_request` → `/internal/media-auth`; photo URLs served from `/media/…` (v2)
- Seed: Dallas + 8 sample houses (two with a contract clock under 7 days, one with a price drop)
- Client `GET /deals` as `DealPublic`; `DealPublic` denylist test becomes permanent

**Tests**

| ID | Type | Case |
|---|---|---|
| P2-T1 | unit | status machine allowed transitions |
| P2-T2 | unit | MAO helper math (admin only) |
| P2-T3 | api | pending user `GET /deals` 403 |
| P2-T4 | api | client does not see `coming_soon` or `dead` |
| P2-T5 | api | **client deal JSON has `arv_cents` and `list_price_cents`, and has none of the denylisted keys in §14** |
| P2-T6 | api | admin deal JSON **does** have rehab + fee + contract dates + lockbox |
| P2-T7 | api | create deal missing price or ARV 422 |
| P2-T8 | api | publish without photo 422 |
| P2-T9 | api | client cannot `POST /admin/deals` |
| P2-T10 | api | photo upload rejects `application/x-php` |
| P2-T11 | api | document download as client 200 + audit; anonymous 401 |
| P2-T12 | integration | Nominatim mocked; saving an address fills lat/lng |
| P2-T13 | e2e | admin creates deal; client list shows price not rehab |
| P2-T14 | api | changing `list_price_cents` writes `DealPriceHistory` and an audit diff `{list_price_cents: [old, new]}` (v2) |
| P2-T15 | api | a `.jpg` upload whose bytes are PHP → 422; a real JPEG with GPS EXIF comes back without EXIF (v2) |
| P2-T16 | integration | `/media/photos/…` → 401 with no cookie, 401 for a `pending` user, 200 for `active`, 200 for admin (v2) |
| P2-T17 | unit | no money field is ever serialized as a float; `1234567` cents renders as `$12,345.67` in the UI helper (v2) |
| P2-T18 | api | soft-deleted deal → 404 for clients and in the admin list, present in `?deleted=true` (v2) |
| P2-T19 | api | `lockbox_code` read by admin writes an audit row (v2) |
| P2-T20 | api | `/map/pins` payload passes the same denylist (v2) |

**Demo:** admin adds “916 Eldridge St” with ARV $110k, rehab $25k, close-by in 6 days; client sees $69,900 and ARV $110k only; admin inventory shows the row in red with “6 days.”

---

### Phase 3 — Browse UI (map + cards) — **OpenStreetMap**

**Goal:** The New Western browse screenshot, on OSM.

**Deliverables**

- Market selector, sort
- Card grid with carousel (**list price**, no ARV on card)
- Leaflet map, OSM tiles, Esri satellite, cluster, price labels, pin↔card sync
- OSM attribution
- Responsive stack
- URL: `/app/browse?market=dallas&sort=price_asc`
- Tile URLs from env so a host can swap to a paid tile proxy if OSM fair-use becomes an issue
- Filters: price range, beds min, property type, occupancy, status — in the URL and on `/map/pins` (v2)
- Card badges: “Offers due <day>”, “Reduced”, “Early access” (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P3-T1 | unit | sort comparators |
| P3-T2 | unit | price label `$69900 → $70K` |
| P3-T3 | api | `/map/pins` only published deals in that market; pin payload has price, not rehab |
| P3-T4 | component | card renders price, address, chips; **no ARV, no rehab** |
| P3-T5 | e2e | changing market changes visible addresses |
| P3-T6 | e2e | sort price low→high puts cheapest first |
| P3-T7 | e2e | Map / Satellite toggle changes tile layer |
| P3-T8 | e2e | OSM attribution is in the DOM |
| P3-T9 | e2e | no network call to `maps.googleapis.com` |
| P3-T10 | e2e | unauthenticated browse → login with `next` |
| P3-T11 | e2e | mobile: no horizontal overflow, map fab works |
| P3-T12 | e2e | `price_max=80000&beds_min=3` in the URL filters both cards and pins; reload keeps it (v2) |
| P3-T13 | component | card shows “Reduced” when `price_history` has a drop and “Offers due” when `offers_due_at` is set (v2) |

**Demo:** log in as client, Dallas, price sort, four cards + OSM pins, satellite toggle, click through.

---

### Phase 4 — Deal detail, documents, notices, watchlist

**Goal:** Deal page with **list price + ARV**, docs, notices. No desk math.

**Deliverables**

- Gallery + lightbox
- Facts, description, occupancy/access
- Client investor strip: list price, ARV
- Mini-map OSM
- Documents + download
- Notices accordion + state PDFs
- Watchlist star
- Contact strip (`tel:` / email / chat stubs until 5–6) — every tap logs a `ContactEvent` (v2)
- Back preserves query
- Video walkthrough embed from `video_url`, hosts from `VIDEO_EMBED_HOSTS`, CSP `frame-src` matched (v2)
- Versioned notices incl. the Texas equitable-interest disclosure for `PUBLIC_PRIMARY_STATE=TX` markets; `POST /deals/:id/acknowledge` (the offer gate itself is P8) (v2)
- “Offers due” countdown in market time; “Reduced $X” badge from price history (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P4-T1 | api | `GET /deals/:id` 404 for unpublished as client |
| P4-T2 | api | public payload keys locked (see P2-T5) |
| P4-T3 | api | download creates audit `doc.downloaded` |
| P4-T4 | api | signed URL expires (freeze time) |
| P4-T5 | api | watchlist add/remove idempotent |
| P4-T6 | e2e | page shows ARV label and list price |
| P4-T7 | e2e | page does **not** contain rehab $, “assignment”, a contract date, or a lockbox code |
| P4-T8 | e2e | lightbox, show more, accordion |
| P4-T9 | e2e | document download is PDF |
| P4-T10 | e2e | admin preview-as-client also hides rehab |
| P4-T11 | api | `video_url` on an allowlisted host is returned; on `evil.example` it is stored but serialized as `null` with an admin warning (v2) |
| P4-T12 | api | tapping Call logs `ContactEvent(kind=call_clicked, deal_id)`; visible in admin activity (v2) |
| P4-T13 | api | acknowledging writes `(user, deal, notice_version)`; bumping the notice version requires a fresh acknowledgment (v2) |
| P4-T14 | e2e | after admin drops the price, the client page shows “Reduced $5,000” and the old price struck through (v2) |
| P4-T15 | e2e | “Offers due” renders in the market’s timezone, not the browser’s (v2) |

**Demo:** open a deal, see asking + ARV, watch the video, open a PDF, expand “NO UNACCOMPANIED ENTRY”, expand the Texas disclosure and acknowledge it.

---

### Phase 5 — In-app chat

**Goal:** Client and admin can talk, including “about this house.” Independent of mail env.

**Deliverables**

- Threads, messages, unread
- Client chat drawer
- Admin inbox (chat only)
- Deal-scoped thread create
- Polling (2–4s) or SSE
- Image attach
- `Notification` table + admin bell + client bell (v2)
- `Outbox` table + worker drain loop with backoff + dead-letter view — introduced here because chat notifications are the first thing that must not be lost (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P5-T1 | unit | unread count |
| P5-T2 | api | client cannot read another buyer’s thread |
| P5-T3 | api | deal thread adds admin as participant |
| P5-T4 | api | empty body 422 |
| P5-T5 | api | chat works with `MAIL_PASSWORD` unset |
| P5-T6 | e2e | two sessions: buyer asks, admin replies within poll |
| P5-T7 | e2e | unread badge |
| P5-T8 | api | a new client message creates `Notification(chat.new)` for every admin; reading clears it (v2) |
| P5-T9 | integration | with the worker stopped, the `Outbox` row exists after the message; starting the worker drains it exactly once (v2) |
| P5-T10 | integration | a job that fails 5 times lands in `dead_at` and appears on `/mail/status.dead_letters` (v2) |

**Demo:** “Is 916 Eldridge still available?” → “Yes, vacant, lockbox.”

---

### Phase 6 — SMTP outbound (Gmail app password)

**Goal:** “Email us about this house” lands in Gmail **when env is set**. Sandbox when it is not.

**Deliverables**

- SMTP worker
- Compose modal
- Admin reply from inbox sends via SMTP
- Sandbox `.eml` path
- `GET /mail/status`
- Runbook: `docs/runbooks/gmail-app-password.md` (+ SPF/DKIM/DMARC section for when a domain exists)
- Banner if sandbox / auth error
- `MailProvider` protocol with `SmtpProvider` + `SandboxProvider`; outbox drains through it (v2)
- Two lanes, `MAIL_DAILY_LIMIT`, `MAIL_RATE_PER_MINUTE`; “sent today / cap” on mailbox status (v2)
- `unsub` JWT, `GET /u/:token`, `List-Unsubscribe` headers, CAN-SPAM footer from `PUBLIC_MAILING_ADDRESS` on lane-2 mail (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P6-T1 | unit | settings parse 16-char password with or without spaces |
| P6-T2 | unit | log redaction: password never in log string |
| P6-T3 | api | client cannot `GET /mail/status` |
| P6-T4 | integration | empty password → `.eml` written, Message stored, `sandbox: true` |
| P6-T5 | integration | mocked SMTP stores EmailLink / Message-ID |
| P6-T6 | integration | mocked SMTP 535 → mailbox_state.last_error set, no crash loop |
| P6-T7 | api | rate limit outbound |
| P6-T8 | e2e | client compose → thread shows sent; admin inbox shows it (sandbox) |
| P6-T9 | integration | with `MAIL_DAILY_LIMIT=3`, the 4th lane-2 email is deferred to the next UTC day and the status page says so; a lane-1 reset email still goes (v2) |
| P6-T10 | integration | lane-2 sends never exceed `MAIL_RATE_PER_MINUTE` (freeze time, count) (v2) |
| P6-T11 | unit | lane-2 mail with `PUBLIC_MAILING_ADDRESS` blank → refused with a clear error; lane-1 unaffected (v2) |
| P6-T12 | api | `GET /u/:token` with a valid `unsub` JWT flips `email_alerts_enabled=false` without a session; an `access` JWT in that slot → 400 (v2) |
| P6-T13 | unit | swapping `SmtpProvider` for `SandboxProvider` at runtime needs no change outside `integrations/` (v2) |

**Demo:** with blank mail env, send from a deal, download the `.eml`. Later, drop in the 16-char password, same UI talks to Gmail. No code change. Set `MAIL_DAILY_LIMIT=2`, send three, watch the third wait.

---

### Phase 7 — IMAP inbound + buyer CRM notes

**Goal:** If someone emails instead of chatting, admin still sees it. Buyer list is a real CRM.

**Deliverables**

- IMAP poller, UID cursor, Message-ID dedup, match-to-user, unmatched queue
- Link unmatched thread to a buyer / deal
- Buyer notes (append-only)
- Activity timeline
- CSV export
- Do-not-contact flag
- POF on buyer (verified by / at)
- **Buyer CSV import → preview → commit; claim-on-register** (v2)
- Tier, tags, lead source, closed/flake counts; Buyers-tab filters and search (`pg_trgm`) (v2)
- Duplicate detection on register (phone / normalized email) (v2)
- Bounce handling: IMAP delivery failures matched to `BlastRecipient` / buyer; three hard bounces auto-disable alerts (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P7-T1 | unit | matcher: from known email → that user |
| P7-T2 | unit | matcher: `[NS-abc]` token → that thread |
| P7-T3 | integration | mocked IMAP insert is idempotent on Message-ID |
| P7-T4 | integration | unknown from-address → unmatched thread |
| P7-T5 | integration | empty mail env → poller no-ops, no error |
| P7-T6 | api | client cannot post notes |
| P7-T7 | api | notes append-only (no PATCH) |
| P7-T8 | api | timeline contains a view after GET deal |
| P7-T9 | api | CSV admin-only |
| P7-T10 | e2e | admin adds a note, reload persists |
| P7-T11 | e2e | do-not-contact blocks compose |
| P7-T12 | api | import a 3-row CSV with one malformed phone → preview shows 2 valid + 1 error; commit writes 2 `ImportedBuyer` rows (v2) |
| P7-T13 | api | registering with an imported email → `active` immediately (approval flag still true), buy box + tier copied, `claimed_user_id` set (v2) |
| P7-T14 | api | registering with a phone that matches a `suspended` user → pending queue shows “possible duplicate of …” (v2) |
| P7-T15 | api | `GET /admin/users?tag=daisy-chainer` returns only tagged buyers; `q=214` matches on phone (v2) |
| P7-T16 | integration | a bounce `.eml` fixture for a known recipient sets `bounced=true`; third one flips `email_alerts_enabled=false` with a note (v2) |

**Demo:** inject a fixture `.eml` as inbound, attach to a buyer, note “Serious — closed 3 with us in 2025.” Import the spreadsheet of 200 old buyers; one of them registers and skips the waiting room.

---

### Phase 8 — Interest, offers, showings

**Goal:** Desk can run a deal from “they clicked” to “they’re coming Thursday.”

**Deliverables**

- I’m interested
- Offer form (amount, **EMD**, close days, **funding type**, **inspection days default 0**, POF) with the Texas acknowledgment gate (v2)
- Offer status machine with **counter / accept / backup ranking / reject / withdraw / expire**; `is_late` after `offers_due_at` (Appendix F) (v2)
- **Showing windows** (admin creates, capacity, host) + buyer RSVP; individual showing request only when no window exists (v2)
- Admin pipeline tab: ranked offers, RSVP lists, requests
- Notify admin + buyer through `Notification` + outbox (chat + SMTP if configured)
- Accepting an offer → deal `pending`, prompt to rank the rest; morning-of reminder for confirmed RSVPs

**Tests**

| ID | Type | Case |
|---|---|---|
| P8-T1 | api | interest unique per (user, deal) |
| P8-T2 | api | offer below $1 422 |
| P8-T3 | api | client cannot accept their own offer |
| P8-T4 | api | showing on `drive_by_only` → 409 (windows cannot be created for it either) |
| P8-T5 | api | accepted offer writes status history |
| P8-T6 | e2e | interest appears in admin pipeline |
| P8-T7 | e2e | showing request → confirm → client sees confirmed |
| P8-T8 | api | offer on a TX deal without a `DealAcknowledgment` for the current notice version → 409 `acknowledgment_required`; with it → 201 (v2) |
| P8-T9 | api | accepting offer A moves the deal to `pending`; B and C can be ranked `backup` 1, 2; each buyer gets a `Notification` (v2) |
| P8-T10 | api | offer after `offers_due_at` → 201 with `is_late=true`; pipeline sorts it after on-time offers (v2) |
| P8-T11 | api | RSVP to a window at capacity → 409 `window_full`; a decline frees the slot (v2) |
| P8-T12 | api | withdraw is allowed in `submitted|countered`, 409 in `accepted|rejected` (v2) |
| P8-T13 | api | counter → buyer `Notification(offer.countered)` with the amount; accepting the counter re-submits at the countered amount (v2) |
| P8-T14 | unit | Appendix F transitions: every illegal move raises (v2) |
| P8-T15 | e2e | admin creates Saturday 10–11 window (cap 6); buyer RSVPs; admin sees the list on a phone (v2) |

**Demo:** interested → acknowledge the TX notice → offer $65k with $2.5k EMD → RSVP Saturday 10am → admin accepts a different offer → buyer is told they’re backup #1.

---

### Phase 9 — Matching, alerts, blasts

**Goal:** New deal in a buyer’s buy box notifies them. Admin can blast matching buyers via SMTP (or sandbox) — capped, tracked, and compliant.

**Deliverables (v2)**

- Buy-box matcher → `Notification(deal.alert)` + lane-2 email for matches; price-drop alerts for watchers; buyer toggle for email alerts
- **Blast composer**: segment (markets, tiers, tags, max price), recipient count, `estimated_finish_at` under the cap, send / schedule / pause; `BlastCampaign` + `BlastRecipient`
- `track` JWT links (`/t/:token`) → per-buyer click log; `unsub` footer + headers from P6
- **Early access**: `early_access_until` on publish (`EARLY_ACCESS_DEFAULT_HOURS`, per-deal override); tier-A alerts first, everyone else at expiry; `DealPublic` and pins filter accordingly
- **“This one’s gone”**: on `assigned|closed`, interested/watching buyers get a message with up to 3 similar live deals

**Tests**

| ID | Type | Case |
|---|---|---|
| P9-T1 | unit | price 120k vs buyer max 100k → no; 150k max → yes |
| P9-T2 | unit | market mismatch → no |
| P9-T3 | integration | publish triggers N alert jobs (as outbox rows) |
| P9-T4 | api | blast admin-only; skips do-not-contact + pending + unsubscribed + bounced-out |
| P9-T5 | api | buyer can disable email alerts |
| P9-T6 | e2e | Dallas max $80k buyer gets in-app alert for a $70k publish |
| P9-T7 | api | `GET /t/:token` logs `blast.clicked` for the right (user, deal, campaign) and 302s to the login wall; a tampered token 302s to `/app/browse` without logging (v2) |
| P9-T8 | api | during early access, tier-A `GET /deals/:id` 200; tier-C 404 and the deal is absent from their list and pins; at `early_access_until` both see it (freeze time) (v2) |
| P9-T9 | unit | 1,400 recipients with `MAIL_DAILY_LIMIT=450`, `MAIL_RATE_PER_MINUTE=20` → `estimated_finish_at` is on day 4; the composer shows it before send (v2) |
| P9-T10 | integration | status → `assigned` creates a `deal.gone` outbox row per interested buyer, with ≤ 3 similar deals (same market, ±25 % price, same type) (v2) |
| P9-T11 | api | blast send with `PUBLIC_MAILING_ADDRESS` blank → 409 `mailing_address_required` (v2) |
| P9-T12 | integration | pausing a campaign mid-send stops new outbox rows; resuming continues without duplicates (v2) |

**Demo:** publish a $70k Dallas 3/2 with 24 h early access; the tier-A buyer gets it now, the rest tomorrow; blast the list, watch the estimate say “finishes Thursday,” click a tracked link, see the click on the buyer’s timeline.

---

### Phase 10 — Metrics

**Goal:** Admin knows what is rotting and what is converting.

Dashboard: counts by status, median DOM, views/chats/offers 7d, per-deal funnel, per-buyer last activity. DuckDB extract only if Postgres aggregations hurt.

**v2 additions:** the **contract-clock board** (every live deal with days-left, sorted, red under 7, with the nightly `contract.expiring` notification); per-blast sent / clicked / bounced and click-to-offer conversion; contact-click leaderboard per deal (`ContactEvent`); tier conversion (views → offers → closes by tier A/B/C); lead-source report (which channel produces closers).

**Tests:** client 403 on metrics; unique viewers math; e2e after fixture load; P10-T4 (v2) contract board lists the two seed deals under 7 days in urgency order; P10-T5 (v2) a seeded campaign with 10 sent / 3 clicked / 1 bounced reports exactly those numbers; P10-T6 (v2) tier conversion math on the golden seed.

---

### Phase 11 — Hardening, mobile polish, legal, preview-as-client

**Deliverables:** preview as client, CSP (OSM + Esri + `VIDEO_EMBED_HOSTS`), backup restore drill, accessibility, load test 200 deals, Trivy in the `security` CI job.

**v2 additions:** per-viewer PDF watermark behind `WATERMARK_DOWNLOADS` (pypdf + reportlab, cached per doc+user for 24 h); admin TOTP 2FA enrollment with recovery codes and the `ADMIN_REQUIRE_2FA` gate; `SECRET_KEY` rotation drill using `SECRET_KEY_PREVIOUS` (documented, rehearsed once); the `denylist-grep` CI job expanded to every key in §14; rate limits from §15.1 verified end-to-end; Sentry wiring behind `SENTRY_DSN` (blank = off).

**Tests:** axe-core; preview hides rehab, contract dates, lockbox; restore backup; unauthenticated `/admin` 401; `/deals` p95 < 300 ms with 200 rows; **the client bundle grep for every denylisted key fails the build**; P11-T7 (v2) a downloaded PDF carries the requesting buyer’s email on every page and a different buyer gets a different stamp; P11-T8 (v2) with `ADMIN_REQUIRE_2FA=true` an un-enrolled admin can only reach the enrollment screen; a wrong TOTP code is 401; a recovery code works once; P11-T9 (v2) rotate `SECRET_KEY` → old access tokens still verify via `SECRET_KEY_PREVIOUS`, new ones are signed with the new key, and after blanking `SECRET_KEY_PREVIOUS` the old tokens are 401.

---

### Phase 12 — Production Compose handoff (brother)

**Goal:** A person who was not in the design meetings can deploy from README + `.env.example` — by pulling tagged images, never by building.

**Deliverables**

- `docker-compose.prod.yml` (no `build:`; images from GHCR by `IMAGE_TAG`)
- TLS notes (Caddy *or* nginx+certbot — he picks)
- Log rotation
- Nightly backup script
- Bootstrap admin CLI
- Runbooks: env, Gmail app password (+ SPF/DKIM/DMARC), backup/restore, disk full, rotate `SECRET_KEY`, **upgrade and rollback by `IMAGE_TAG`** (v2), **GHCR login with a read-only token** (v2)
- Checklist: “mail can be blank on day one”; “`PUBLIC_MAILING_ADDRESS` must be set before the first blast” (v2)
- `v1.0.0` tag and GitHub Release with the full CHANGELOG (v2)

**Tests**

| ID | Type | Case |
|---|---|---|
| P12-T1 | compose | prod overlay config valid; contains no `build:` stanza (v2) |
| P12-T2 | smoke | cold `pull` + `up -d` from a clean box with only `.env` and the two compose files, `/healthz` green within 60 s, mail blank |
| P12-T3 | smoke | `/public/config` reflects env brand; `/version` reports the pinned `IMAGE_TAG` (v2) |
| P12-T4 | docs | `.env.example` contains every `Settings` field (CI check) |
| P12-T5 | infra | backup artifact non-empty; restore dry-run documented |
| P12-T6 | drill | upgrade `IMAGE_TAG` from `v0.11.0` to `v1.0.0` (migration runs), then roll back to `v0.11.0` with the documented `alembic downgrade`; `/healthz` green both ways (v2) |
| P12-T7 | review | the brother follows the README on a machine we have never touched and reaches the login page without asking a question — he approves the PR (v2) |

We do **not** provision his VPS. We do **not** need the provider name.

---

## 17. Test strategy

| Layer | Tool | Where it runs |
|---|---|---|
| Unit | pytest / vitest | no IO |
| API | pytest + httpx + Compose Postgres | `backend/tests` |
| Worker | pytest with fake SMTP/IMAP + Redis | `backend/tests/workers` |
| Component | vitest + Testing Library + MSW | `frontend` |
| E2E | Playwright against Compose | `frontend/tests/e2e` |
| Infra | `docker compose config`, env-example sync, hadolint, denylist-grep | CI |
| CI (v2) | GitHub Actions — every push runs lint/unit/api/component/migrations/openapi-sync; PRs to `main` add e2e/infra/denylist-grep; tags run release | `.github/workflows` |

Golden seed (Dallas, 8 deals, 1 admin, 2 clients: pending + active) from Phase 2 on. v2 seed additions: two deals with a contract clock under 7 days, one deal with a price drop, one deal with `offers_due_at` tomorrow and a showing window Saturday, 5 imported buyers (one already claimed), one tier-A buyer with verified POF, one `do_not_contact` buyer, one buyer with three bounces. E2E never talks to Gmail or OSM Nominatim (those are mocked). Tile loads in e2e may hit OSM — if CI network is flaky, stub tiles.

**Rule:** a phase that adds a route adds one happy test and one authz-negative test. Plus, from Phase 2 on, the **`DealPublic` / `/map/pins` key-denylist test is permanent** — the key list in §14 is the single source of truth, and the `denylist-grep` CI job greps the built client bundle for the same keys.

**Rule (v2):** a phase that adds a token type adds the three negative tests: wrong `typ`, wrong key, expired. A phase that adds an admin mutation adds the audit-diff assertion.

`make test` → backend pytest + frontend unit + Playwright, all inside Compose. CI runs the identical `make` targets — if it passes locally inside Compose, it passes in CI, and vice-versa.

---

## 18. Non-goals (v1)

- Public unauthenticated inventory
- Native apps
- SMS (consent is collected; sending is not built)
- Multi-wholesaler SaaS
- Automated valuations
- Payments / EMD escrow (EMD is recorded on the offer, never held by the system)
- MLS / IDX ingest
- Replacing Gmail UI
- Kubernetes
- DuckDB as the live database
- Google Maps
- Gmail OAuth
- Hardcoded final brand/domain
- Transactional email provider (Postmark / SES / Resend) — the `MailProvider` slot exists; filling it is a later phase (v2)
- PWA / Web Push — v1.1 (v2)
- `ops` role — deferred (v2)
- Client-visible lockbox codes — never in v1 (v2)

---

## 19. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| OSM tile fair-use | OSM may throttle | Tile URL is env; brother can point at a tile proxy (MapTiler, self-hosted). Attribution always on. |
| Esri imagery ToS | Satellite layer might need a swap | `MAP_SAT_TILE_URL` is env |
| Nominatim rate limit | Geocode failures on bulk upload | Cache; 1 req/s; bulk import uses a CSV with lat/lng already filled |
| Gmail app passwords deprecated | Mail breaks | Isolated in `integrations/smtp.py` + `imap.py`; OAuth would be a new phase, not a rewrite |
| **Gmail daily cap hit** (v2) | Google suspends sending for up to 24 h — approval emails and reset links die with the blast | `MAIL_DAILY_LIMIT` with headroom; two lanes; honest `estimated_finish_at`; `MailProvider` slot for a real ESP when the list outgrows Gmail |
| **Bounce storm from an imported list** (v2) | Mailbox reputation burned on day one | First blast to tier-A only; three hard bounces auto-disable; bounces surfaced per campaign |
| App password in `.env` | Mailbox takeover if the file leaks | Host permissions; never commit; redact logs; Docker secrets if brother wants |
| **`SECRET_KEY` leak** (v2) | Anyone can mint an admin JWT | 32+ random bytes; never in CI; rotation drill with `SECRET_KEY_PREVIOUS` (P11); `ver` bump for everyone invalidates existing tokens in one query; 2FA on admins limits the blast radius of a forged *client* token |
| **GitHub free plan** (v2) | Branch protection and CODEOWNERS are not enforced on private repos; GHCR private storage and Actions minutes are capped | The procedure in §6.8 is the rule whether or not GitHub enforces it; e2e only on PRs to `main` + nightly; keep 5 tags of images; upgrade to Pro (cheap) if enforcement is wanted — §20 Q1 |
| **Agent skips the procedure** (v2) | Work exists on one machine, un-reviewed, untagged | CONTRIBUTING.md is §6.2–6.8 verbatim; the phase doc’s green-run record and the GHCR tag are the proof; no tag, no phase |
| Open register flood | Fake buyers see waiting room (ok) or, if approval is flipped off, see addresses | Keep `REQUIRE_ADMIN_APPROVAL=true`; rate limit register; captcha later if needed |
| Rehab leak | Buyers learn the assignment | Separate serializers + CI denylist + preview-as-client test |
| **Daisy-chaining** (v2) | Another wholesaler re-markets the contract | Versioned no-daisy-chain terms; watermarked packets; download audit; `daisy-chainer` tag + suspend |
| Brand still TBD | Ugly placeholder at launch | Runtime config; 30-second rename |
| Brother’s host too small | OOM | README says 4 GB RAM minimum; Compose memory limits |
| Chat polling cost | Idle tabs | Visible tab 4s, background 30s |
| Off-market leak | Business-ending | Login + pending + audit + no public buckets + media behind `auth_request` |
| Legal | Brokerage / state notices; Texas equitable-interest disclosure; CAN-SPAM; TCPA | Notice infrastructure in Phase 4; copy reviewed by their broker/attorney before P4 merges; composer enforces CAN-SPAM; SMS consent captured |

---

## 20. Locked decisions & remaining questions

### Locked (do not re-ask)

1. **Brand / domain** — placeholder “Northstar Dispo”; real values in `.env` / `/public/config`.
2. **Registration** — open. No invite code. Pending until admin approval (`REQUIRE_ADMIN_APPROVAL=true`).
3. **Buyer economics** — list price + ARV on the client. Rehab, assignment fee, MAO, contract clock, lockbox, deal structure, JV admin-only.
4. **Maps** — OpenStreetMap + Leaflet. Esri satellite. No Google Maps.
5. **Mail** — Gmail address + 16-char app password in `.env`. SMTP + IMAP. Sandbox until filled. No OAuth in v1. Capped and queued (§13.8).
6. **Hosting** — fully containerized Compose. Brother deploys from GHCR images by tag. We do not pick the VPS.
7. **Source control (v2)** — `github.com/giuseppegaliazzitx-bit/Sellstuff`, `main` protected by procedure, phase branches, checkpoint commits, PR + CI green, two tags per phase, images from tags. §6.2–6.8 is mandatory for every change.
8. **Verification (v2)** — JWT access token in an HttpOnly cookie with `ver`-based instant revocation; DB-backed rotating refresh; JWT for every one-time link. §8.4–8.6.
9. **Team (v2)** — builder + brother. CI is the reviewer; the brother signs off on P0, P6, P12. `ops` deferred.

### Open questions (v2) — answers needed, in order of when they block

| # | Question | Why it matters | Blocks |
|---|---|---|---|
| Q1 | **Which GitHub plan is the `giuseppegaliazzitx-bit` account on?** Free personal, or Pro/Team? | On the free plan, a *private* repo gets no enforced branch protection, no CODEOWNERS enforcement, limited private-package storage on GHCR, and a monthly cap on Actions minutes. Everything in §6 still works as a discipline, but “cannot merge red” becomes “must not merge red.” Pro is a few dollars a month and fixes all four. Alternative: make the repo public (nothing secret lives in it by design) and everything is free and enforced — but the design doc and seed addresses would be public too. | Phase 0 repo settings |
| Q2 | **Is the repo currently empty?** (A web search could not see it — it is probably private.) Is the default branch `main`? Anything already committed we must keep? | Phase 0 starts with `git init` semantics vs. a first commit onto existing history. | Phase 0, first commit |
| Q3 | **Who is the “builder” day to day — you at a keyboard, or an AI coding agent you direct?** Both follow §6.8, but the wording of `CONTRIBUTING.md` and whether the agent gets its own GitHub machine account / fine-grained PAT (recommended: yes, scoped to this repo, so its commits are attributable) depends on the answer. | Phase 0 CONTRIBUTING + repo access |
| Q4 | **Is the shop mailbox consumer Gmail (`@gmail.com`) or Google Workspace on a domain?** | Daily cap (~500 vs ~2,000) sets `MAIL_DAILY_LIMIT`; Workspace also unlocks SPF/DKIM/DMARC on the shop’s domain, which is what keeps blasts out of spam. | Phase 6 defaults; Phase 9 blast sizing |
| Q5 | **Is there a physical mailing address (office, PO box, registered agent) for the CAN-SPAM footer?** | Blasts refuse to send without it. It can be blank through Phase 8. | Phase 9 first real blast |
| Q6 | **Who reviews the Texas equitable-interest notice copy — your broker, an attorney, or neither yet?** | The disclosure is required by statute; the app enforces a per-deal acknowledgment, but the *words* must be confirmed by someone licensed. We ship a draft; it should not go live unreviewed. | Phase 4 merge |
| Q7 | **Tier defaults:** should verified-POF buyers auto-become tier A, and should early access default to 0 h (off) or something like 12–24 h? | Sets `EARLY_ACCESS_DEFAULT_HOURS` and the approve-flow default. Safe to defer: the env default is `0` (off). | Phase 9 |
| Q8 | **EMD handling:** the offer records the EMD amount; is the money handled entirely outside the system (title company), with the admin just marking “EMD received”? (Recommended yes for v1.) | Whether a `emd_received_at` field and notification exist in P8, or payments show up in non-goals forever. | Phase 8 |
| Q9 | **Does the brother want his own admin login, or only box access?** | Determines whether `BOOTSTRAP_ADMIN_*` seeds one account or the CLI creates two, and whether his 2FA enrollment is part of P11. | Phase 1 seed; Phase 11 |

### Still useful later (do not block Phase 0–2)

- Logo file (or keep the typographic wordmark)
- Licensed-broker footer copy / which state notices to highlight beyond Texas
- Launch markets beyond the Dallas seed
- Whether HUD FMR / est. rent should later join the client strip (currently **no**)
- Whether the client-facing “agent” is a person (photo, license #) or just the company brand from env
- Offers binding vs indicative (v1 copy = non-binding)
- When to move blasts off Gmail to a real ESP (the `MailProvider` slot)

---

## 21. Definition of done for the whole product

We are done with **v1** when:

1. An unauthenticated person cannot see a single address — or a single photo (`/media` is gated).
2. A stranger can register, accept the versioned terms, and see a waiting room until an admin approves; an imported buyer skips the room.
3. An approved client can browse a market on **OSM** + cards with filters, open a deal, see **list price + ARV** (and not rehab / fee / contract clock / lockbox), watch the video, download a (watermarked) packet, acknowledge the Texas notice, make an offer with EMD, RSVP to a showing window, call, chat, and email (or be told email is sandboxed).
4. An admin can add/remove deals (full math + contract clock), approve buyers, import a buyer list, tier and tag buyers, rank backup offers, run showing windows, add notes, see who viewed and tapped what, answer chat, answer email once `MAIL_*` is set, send a capped + tracked blast, and see metrics including the contract board.
5. Changing `PUBLIC_BRAND_NAME` (and friends) in `.env` rebrands the running app without a code change.
6. The entire graph runs under Docker Compose with mail left blank; the brother can fill env, pull `v1.0.0` from GHCR, and deploy from the runbook — and roll back to the previous tag in two commands.
7. Every phase’s test list is green, including the **`DealPublic` denylist**, and every phase has its two tags and its images on GHCR. (v2)
8. Suspending a user from the admin kills their session on their next request; a reused refresh token kills the whole family. (v2)
9. A blast larger than the daily cap queues, tells the admin when it will finish, and never sends without a mailing address and an unsubscribe link. (v2)

Until then, we ship **phases**, not a rewrite.

---

## Appendix A — Visual language

| Token | Value (starting point) |
|---|---|
| Header | `#2B2B2B` charcoal |
| Gold | `#C0985C` |
| Gold hover | `#A8844E` |
| Page | `#F7F6F3` warm gray |
| Card | `#FFFFFF` |
| Chip | `#F1EEE8` pill |
| Price type | 28–32px, tight, near-black |
| ARV type | smaller, labeled, not gold (don’t compete with asking) |
| Map pins | red house + white `$70K` |
| Status Available | gold fill chip |
| Font | clean grotesque (Source Sans / IBM Plex Sans), tokenized |

Mobile: 390-wide browse must work. Admin inventory can be “use a laptop” in v1; inbox and approve/reject must work on a phone.

Wordmark: `PUBLIC_BRAND_NAME` in gold on charcoal until a `PUBLIC_LOGO_URL` exists.

---

## Appendix B — Status machine

```text
coming_soon → available → pending → under_contract → assigned → closed
                 ↓            ↓
                dead         dead
```

- `coming_soon`: admin + preview only
- `available`: clients see it
- `pending`: still visible, chip changes; new offers allowed by default
- `assigned` / `closed`: hidden from client browse, URL 404
- `dead`: hidden, reason required

Every arrow writes `DealStatusHistory`.

---

## Appendix C — What we deliberately changed from New Western

| NW | Us | Why |
|---|---|---|
| Large multi-market brokerage | Single wholesaler shop | That’s the user |
| Salesforce-backed deals | Postgres | We own the stack |
| Google Maps | Leaflet + OSM + Esri satellite | Locked: no Maps key |
| Intercom + FullStory | Our chat, no session replay in v1 | PII |
| Public-ish marketing site + gated app | Fully gated inventory, open register + approval | Off-market, still acquirable |
| Full investor pitch numbers | Client: list price + ARV only | Stakeholder lock |
| Hardcoded brand | `.env` + `/public/config` | Name still in the works |
| Documents on S3 with 1h signed URLs | Same idea, our bucket, audited | |
| No buyer CRM in the buyer app | Admin CRM | The actual business |
| No Gmail tab | SMTP/IMAP from env app password | Stakeholder: email + 16-char pass later |
| DuckDB (originally requested) | Postgres + optional DuckDB analytics | Correct tool |
| Hosted by us on a chosen VPS | Compose handoff to brother | Stakeholder lock |

---

## Appendix D — Phase dependency graph

```text
P0 platform (env brand, compose, health)
 └─ P1 auth (open register + approval)
     └─ P2 inventory API (DealPublic vs DealAdmin)
         ├─ P3 browse UI (Leaflet/OSM)
         │   └─ P4 deal UI (price + ARV) ── P8 offers/showings
         ├─ P5 chat ── P6 SMTP out ── P7 IMAP in + CRM
         │                              └─ P9 matching
         └─ P10 metrics
              └─ P11 harden
                   └─ P12 compose handoff (brother)
```

P3 and P5 can overlap after P2. P6 must not start until P5 threads — and the `Outbox` table P5 introduces — exist. P6/P7 must pass with **empty** `MAIL_*`. P8’s acknowledgment gate needs P4’s versioned notices; P9’s tiers need P7’s buyer profile columns. With two people, “overlap” means two phase branches, each rebased on `main` before its PR, never two people on one branch.

---

## Appendix E — Gmail 16-char password (operator cheat sheet)

This is what “I’ll set it up later with the email + 16 char pass” means in Google’s UI:

1. Turn on 2-Step Verification on the Google account that will own the inbox.
2. [Google App Passwords](https://myaccount.google.com/apppasswords) → app “Mail”, device “Other” (Northstar).
3. Copy the 16 characters into `MAIL_PASSWORD`. Username is the full email.
4. Restart `backend` and `worker`.
5. Admin → Settings → mailbox status should flip from “sandbox” to “connected” after the first successful SMTP or IMAP handshake.
6. (v2) Before the first blast: set `PUBLIC_MAILING_ADDRESS`, confirm `MAIL_DAILY_LIMIT` matches the account type (consumer ≈ 500 → keep 450; Workspace ≈ 2,000 → 1,800), and if the mailbox is on the shop’s own domain, set SPF, DKIM, and DMARC in DNS.

Workspace accounts may need the admin to allow app passwords. If that’s blocked, the fallback is a dedicated consumer Gmail, or a later OAuth phase.

Until this is done, chat, phone, and sandbox `.eml` cover contact.

---

## Appendix F — Offer status machine (v2)

```text
                 ┌──────────── withdraw ────────────┐
                 │                                  │
 submitted ──counter──▶ countered ──accept-counter──▶ (re-submitted at counter amount)
    │  │                   │   │
    │  │                   │   └── withdraw ──▶ withdrawn
    │  │                   └────── reject ────▶ rejected
    │  ├── accept ──▶ accepted  ──(admin: deal → pending)
    │  ├── backup ──▶ backup    ──(rank 1..n; promote ──▶ accepted when #1 falls through)
    │  ├── reject ──▶ rejected
    │  └── withdraw ▶ withdrawn
    └── offers_due_at passes with no decision and admin runs "expire" ──▶ expired
```

| From | To | Who | Side effects |
|---|---|---|---|
| `submitted` | `countered` | admin | `counter_amount_cents`, `counter_note`; `Notification(offer.countered)` |
| `submitted` / `countered` | `accepted` | admin | deal → `pending`; prompt to rank others; `Notification(offer.accepted)`; audit |
| `submitted` / `countered` | `backup` (rank n) | admin | `Notification(offer.backup)` with rank |
| `submitted` / `countered` | `rejected` | admin | `Notification(offer.rejected)` |
| `submitted` / `countered` | `withdrawn` | buyer | admin `Notification`; frees rank |
| `countered` | `submitted` (new amount) | buyer accepts counter | new `Offer` row linked by `parent_offer_id`; old row → `accepted_counter` in audit only |
| `backup` | `accepted` | admin (promote) | previous accepted → `rejected` or `withdrawn` by reason; deal stays `pending` |
| `backup` | `rejected` / `withdrawn` | admin / buyer | re-rank remaining backups |
| any open | `expired` | admin bulk action or nightly job when deal leaves `available|pending` | `Notification(offer.expired)` |

Illegal transitions raise `OfferTransitionError` → `409 offer_transition_invalid`. Every transition writes `AuditLog` with `{status: [from, to], rank: [from, to]}`. `is_late` is set at submission and never changes. A buyer can have at most one open (`submitted|countered|backup`) offer per deal; a new submission while one is open → `409 offer_exists` (withdraw first).

---

## Appendix G — Git quick-reference card (goes into `CONTRIBUTING.md`, v2)

```text
BRANCHES   main (never commit here) · phase/NN-slug · feat|fix/NN-slug · spike/slug (never merged) · hotfix/slug
COMMITS    type(scope): subject        types: feat fix test docs chore refactor perf ci build revert
           footer: Phase: NN / Tests: P1-T3,P1-T4 / Refs: #12
           push after EVERY checkpoint · wip: allowed on branch, squashed before PR · one Alembic revision per PR
CHECKPTS   open → schema → backend → backend tests → frontend → e2e → env+docs → close
PR         title "Phase NN — name" · every template box checked · CI green · demo script followed
MERGE      phase→main: merge commit (--no-ff) · feat→phase: squash · hotfix→main: squash + cherry-pick into open phase
TAGS       git tag -a phase-NN && git tag -a v0.NN.0 on the merge commit · push both · release.yml builds images
IMAGES     ghcr.io/giuseppegaliazzitx-bit/sellstuff-backend:{tag}  ·  -frontend:{tag}  ·  :sha-{short}
PROD       IMAGE_TAG=vX.Y.Z docker compose -f docker-compose.yml -f docker-compose.prod.yml pull && up -d
ROLLBACK   previous IMAGE_TAG + pull + up -d (+ alembic downgrade named in release notes)
NEVER      commit .env / *.eml / secrets · git push --force · rebase main · merge red · build images on the box
ALWAYS     make lint && make test inside Compose before PR · denylist test in the same commit as DealPublic changes
```

---

## Appendix H — JWT claim reference (v2)

All tokens: `alg=HS256`, signed with `SECRET_KEY` (`SECRET_KEY_PREVIOUS` verify-only during rotation), `iss = JWT_ISSUER` (defaults to `PUBLIC_DOMAIN`), `aud = "northstar"`, 30 s leeway. Verifier requires `exp, iat, sub, jti, typ` and **rejects a `typ` that does not match the endpoint**.

| Claim | Meaning | `access` | `verify_email` | `reset` | `track` | `unsub` |
|---|---|---|---|---|---|---|
| `sub` | user id (UUIDv7) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `typ` | token purpose | `access` | `verify_email` | `reset` | `track` | `unsub` |
| `jti` | unique id (Redis denylist / single-use set) | ✓ | ✓ single-use | ✓ single-use | ✓ | ✓ |
| `iat` / `exp` | issued / expires | 15 min | 24 h | 30 min | 30 d | 90 d |
| `iss` / `aud` | issuer / audience | ✓ | ✓ | ✓ | ✓ | ✓ |
| `sid` | refresh family id | ✓ | — | — | — | — |
| `role` | `client` / `admin` | ✓ | — | — | — | — |
| `status` | `pending` / `active` / `suspended` | ✓ | — | — | — | — |
| `ver` | `users.token_version` at issue | ✓ (checked vs Redis every request) | — | ✓ (bound; consuming bumps it) | — | — |
| `deal` | deal id | — | — | — | ✓ | — |
| `campaign` | blast campaign id | — | — | — | ✓ | — |
| `email` | address the token was sent to | — | ✓ | — | — | ✓ |

Example access payload:

```json
{
  "sub": "0191f2a0-7c3e-7a1b-9d2e-4f5a6b7c8d9e",
  "typ": "access",
  "jti": "0191f2a0-8e44-7c2f-8a1d-2b3c4d5e6f70",
  "sid": "0191f2a0-7d10-7e3a-b4c5-d6e7f8a9b0c1",
  "role": "client",
  "status": "active",
  "ver": 3,
  "iat": 1787000000,
  "exp": 1787000900,
  "iss": "deals.example.com",
  "aud": "northstar"
}
```

Example `track` payload (never grants a session):

```json
{ "sub": "…user…", "typ": "track", "jti": "…", "deal": "…deal…", "campaign": "…campaign…",
  "iat": 1787000000, "exp": 1789592000, "iss": "deals.example.com", "aud": "northstar" }
```

Verification order on every request: cookie or bearer → decode with pinned alg → `typ == access` → `exp/iat/iss/aud` → `jti` not denylisted → `ver == cached users.token_version` (Redis, 5-min TTL, DB fallback) → `status` allows the route → `role` allows the route. Failure codes: `token_expired`, `token_stale` (`ver` mismatch), `token_invalid` (everything else), `csrf_failed`.

Rotation: set `SECRET_KEY_PREVIOUS=<old>`, `SECRET_KEY=<new>`, restart. Old tokens verify, new tokens sign with the new key. Either wait out the longest TTL (90 d for `unsub`) or bump `ver` for everyone (`python -m app.cli bump-token-version --all`) and blank `SECRET_KEY_PREVIOUS` the next day — `unsub` links in old emails then stop working, which is the one thing to decide consciously.

---

*End of design. Next step when coding is allowed: Phase 0 only — on a branch, with a PR, per §6.8.*
