"""P0-T8 — alembic upgrade head is idempotent."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_head_idempotent(tmp_path: Path, monkeypatch) -> None:
    db = tmp_path / "mig.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{db.as_posix()}")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-must-be-at-least-32b")
    env = dict(**{k: v for k, v in __import__("os").environ.items()})
    cmd = [sys.executable, "-m", "alembic", "upgrade", "head"]
    first = subprocess.run(cmd, cwd=BACKEND, env=env, capture_output=True, text=True)
    assert first.returncode == 0, first.stdout + first.stderr
    second = subprocess.run(cmd, cwd=BACKEND, env=env, capture_output=True, text=True)
    assert second.returncode == 0, second.stdout + second.stderr
    heads = subprocess.run(
        [sys.executable, "-m", "alembic", "heads"],
        cwd=BACKEND,
        env=env,
        capture_output=True,
        text=True,
    )
    assert heads.returncode == 0
    lines = [ln for ln in heads.stdout.splitlines() if ln.strip()]
    assert len(lines) == 1
