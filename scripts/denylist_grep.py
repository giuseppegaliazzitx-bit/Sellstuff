"""Fail if denylisted DealAdmin keys leak into client browse/detail source."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DENY = [
    "rehab_low_cents",
    "rehab_high_cents",
    "assignment_fee_cents",
    "mao_cents",
    "lockbox_code",
    "contract_executed_at",
    "option_period_ends_at",
    "contract_close_by",
    "jv_partner_name",
    "jv_partner_phone",
    "jv_partner_email",
    "jv_fee_split_pct",
    "hud_fmr_cents",
    "early_access_until",
]
SCAN = [
    ROOT / "frontend" / "src" / "features" / "browse",
    ROOT / "frontend" / "src" / "features" / "deal" / "DealPage.tsx",
]


def main() -> int:
    hits: list[str] = []
    files: list[Path] = []
    for path in SCAN:
        if path.is_dir():
            files.extend(path.rglob("*.ts"))
            files.extend(path.rglob("*.tsx"))
        elif path.exists():
            files.append(path)
    for file in files:
        text = file.read_text(encoding="utf-8")
        for key in DENY:
            if key in text:
                hits.append(f"{file.relative_to(ROOT)}: {key}")
    if hits:
        print("denylist keys in client browse/detail:")
        print("\n".join(hits))
        return 1
    print("denylist-grep clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
