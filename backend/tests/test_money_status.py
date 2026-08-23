import pytest
from app.core.errors import AppError
from app.services.money import format_usd, mao_cents, price_label
from app.services.status import ALLOWED, assert_transition


def test_mao_math() -> None:
    # ARV 110_000, rehab 25_000, fee 8_000 → 110k*0.7 - 25k - 8k = 44k
    assert mao_cents(11_000_000, 2_500_000, 800_000) == 4_400_000


def test_money_never_float_format() -> None:
    assert format_usd(1_234_567) == "$12,345.67"
    assert "." in format_usd(100)
    assert isinstance(mao_cents(100, 1, 1), int)


def test_price_label() -> None:
    assert price_label(69_900_00) == "$70K"


def test_status_machine() -> None:
    assert_transition("available", "pending")
    with pytest.raises(AppError):
        assert_transition("closed", "available")
    assert "dead" in ALLOWED["available"]
