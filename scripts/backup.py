"""Thin wrapper so Windows can run backups without bash. P0-T backup dry-run."""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out = ROOT / "data" / "backups" / stamp
    db = ROOT / "data" / "northstar.db"
    media = ROOT / "data" / "media"
    print(f"backup target: {out}")
    if args.dry_run:
        print("dry-run: would copy sqlite + media")
        print(f"dry-run: db exists={db.exists()} media exists={media.exists()}")
        return 0
    out.mkdir(parents=True, exist_ok=True)
    if db.exists():
        shutil.copy2(db, out / "northstar.db")
    if media.exists():
        shutil.copytree(media, out / "media", dirs_exist_ok=True)
    print(f"backup complete: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
