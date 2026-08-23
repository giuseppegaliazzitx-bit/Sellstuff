"""P0-T13 — `.env.example` keys match Settings fields."""

from __future__ import annotations

import re
from pathlib import Path

from app.core.config import Settings

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_EXAMPLE = REPO_ROOT / ".env.example"

# Settings fields that are not operator knobs (or use a different env name).
SKIP_FIELDS = {"jwt_audience"}


def _example_keys() -> set[str]:
    keys: set[str] = set()
    for line in ENV_EXAMPLE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = re.match(r"^([A-Z][A-Z0-9_]+)=", stripped)
        if match:
            keys.add(match.group(1))
    return keys


def _settings_keys() -> set[str]:
    keys: set[str] = set()
    for name, field in Settings.model_fields.items():
        if name in SKIP_FIELDS:
            continue
        alias = field.alias
        env_name = alias if alias and alias.isupper() else name.upper()
        keys.add(env_name)
    return keys


def test_env_example_covers_settings() -> None:
    example = _example_keys()
    settings = _settings_keys()
    missing_in_example = settings - example
    extra_in_example = example - settings
    assert missing_in_example == set(), (
        f"Settings fields missing from .env.example: {missing_in_example}"
    )
    assert extra_in_example == set(), f".env.example keys missing from Settings: {extra_in_example}"
