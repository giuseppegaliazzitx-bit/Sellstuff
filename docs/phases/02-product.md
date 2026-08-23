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
| 11 | CSP + nosniff headers; preview-as-client = DealPublic page |
| 12 | Compose files from Phase 0 still apply |

## Green-run

Backend pytest includes denylist tests. Frontend vitest covers DealCard (no ARV) and money formatting.
