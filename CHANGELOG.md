# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: `v0.NN.0` per phase; Phase 12 is `v1.0.0`.

## Unreleased

### Added

- Phase 0 platform skeleton: FastAPI health/version/public-config, Vite SPA shell with runtime brand, Alembic baseline, local-first SQLite, Docker files for later.
- Phase 1 auth: open register, JWT cookies, rotating refresh, CSRF, pending approval, waiting room, admin buyers, sessions.
- Phases 2–10 product: inventory (DealPublic vs DealAdmin), OSM browse, deal detail, chat, sandbox mail, offers/showings, CRM notes, metrics/contract clock. Docker files remain for Phase 12.
- Buyer CSV import + claim-on-register, buy-box matching on publish, sandbox blasts with send cap estimate, Nominatim geocode (mockable), admin photo/status/geocode, offer pipeline, watchlist.
- Settings (profile, buy box, sessions), watchlist + my offers + notifications, legal pages, deal lightbox/docs/RSVP/email, admin deal editor and buyer CRM notes.
- Password reset (local sandbox link), map pin → deal, mini-map, showing windows, offer counter/backup, mailbox status, PDF watermark hook, IMAP matcher.
- TOTP enrollment + login challenge + recovery codes; ADMIN_REQUIRE_2FA desk gate; IMAP ingest/unmatched queue; early-access filter + chip; landing page; video embed; mark-all notifications; buyer activity; change password.
- Phase 9–12 leftovers: price-drop + gone/similar alerts, blast segments/resume/track clicks, richer metrics, buyer CSV export + duplicate-phone hint + POF, create-admin CLI, Sentry hook, denylist-grep, deploy runbooks.
- Operator catalog of every `.env` knob: `docs/runbooks/env-variables.md`.
- Open signup: `REQUIRE_ADMIN_APPROVAL=false`; landing CTA is Sign up, not Request access.
- Admin Settings: view-as-buyer toggle; seeded demo buyer; beds/baths cannot be negative.
- Browse filters are Your Market + Sort Options only; buyer cards no longer show Available.
