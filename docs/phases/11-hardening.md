# Phase 11 — Hardening

Shipped on `phase/02-product` without waiting on Docker.

| Item | Status |
|---|---|
| Preview as client | Deal detail is DealPublic; admin editor has the link |
| CSP | OSM + Esri + VIDEO_EMBED_HOSTS; nosniff |
| TOTP + ADMIN_REQUIRE_2FA | enroll / login / recovery codes |
| Watermark | `WATERMARK_DOWNLOADS` + pypdf |
| SECRET_KEY_PREVIOUS | verify-only; tests cover rotate + blank |
| Sentry | `SENTRY_DSN` blank = off (optional `sentry_sdk`) |
| Denylist grep | `python scripts/denylist_grep.py` on browse/detail source |

Still later: axe-core, Playwright against Compose, Trivy, 200-deal load.
