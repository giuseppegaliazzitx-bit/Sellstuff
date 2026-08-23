from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_prod_overlay_uses_ghcr_and_resets_build() -> None:
    text = (ROOT / "docker-compose.prod.yml").read_text(encoding="utf-8")
    assert "ghcr.io/" in text
    assert "IMAGE_TAG" in text
    assert "build: !reset" in text
    assert "ENVIRONMENT: prod" in text
