"""ARQ worker settings. Empty until later phases enqueue jobs.

The worker image uses the same backend image with a different CMD.
Without Redis it will not start — that is expected on the laptop.
"""

from __future__ import annotations

# Placeholder so `python -c "from app.workers.settings import WorkerSettings"` works.
# Real ARQ functions land with chat/mail/matching.


class WorkerSettings:
    functions: list = []
    max_jobs = 10
