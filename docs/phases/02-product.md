# Phases 02–10 — Product (inventory through metrics)

Shipped together on `phase/02-product` so the laptop has a working desk without waiting on Docker or twelve PRs.

| Phase | In this branch |
|---|---|
| 2 | Markets, deals, DealPublic denylist, photos/docs, soft delete, seed Dallas |
| 3 | OSM Leaflet browse, cards (price not ARV), sort/filters |
| 4 | Deal detail with ARV, notices, watchlist, contact events, acknowledge |
| 5 | Chat threads + notifications + outbox row |
| 6 | Sandbox `.eml` outbound + mail status |
| 7 | CRM notes (append-only) |
| 8 | Interest, offers (TX ack gate), showing windows |
| 9 | Track/unsub JWT endpoints (blasts UI later) |
| 10 | Metrics overview + contract-clock board |
| 11 | CSP + nosniff headers; preview-as-client = DealPublic page; TOTP enroll/login; ADMIN_REQUIRE_2FA |
| 12 | Compose files from Phase 0 still apply |
| extra | IMAP ingest + unmatched queue, early-access window, landing page, video embed |
| 9 leftovers | gone/similar alerts, price-drop alerts, blast segments + resume, track clicks |
| 10 leftovers | funnel, 7d activity, blast stats, contact leaderboard, tier/lead-source |
| 11 leftovers | Sentry hook, SECRET_KEY blank-previous test, denylist-grep script |
| 12 leftovers | create-admin CLI, deploy/env runbooks (Compose still later) |

## Green-run

Backend pytest includes denylist tests. Frontend vitest covers DealCard (no ARV) and money formatting.
