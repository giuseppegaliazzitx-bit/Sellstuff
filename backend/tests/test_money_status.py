from datetime import UTC, datetime

import pytest
from app.core.errors import AppError
from app.models import Deal
from app.services.deals import sort_deals
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


def test_sort_beds_and_baths() -> None:
    now = datetime.now(UTC)
    a = Deal(
        id="a",
        market_id="m",
        status="available",
        list_price_cents=1,
        arv_cents=1,
        address1="a",
        city="Dallas",
        state="TX",
        beds=2,
        baths=1,
        sqft=900,
        created_at=now,
        updated_at=now,
    )
    b = Deal(
        id="b",
        market_id="m",
        status="available",
        list_price_cents=1,
        arv_cents=1,
        address1="b",
        city="Dallas",
        state="TX",
        beds=4,
        baths=3,
        sqft=1800,
        created_at=now,
        updated_at=now,
    )
    assert [d.id for d in sort_deals([a, b], "beds")] == ["b", "a"]
    assert [d.id for d in sort_deals([a, b], "baths")] == ["b", "a"]
    assert [d.id for d in sort_deals([a, b], "price_asc")] == ["a", "b"]


def test_status_machine() -> None:
    assert_transition("available", "pending")
    with pytest.raises(AppError):
        assert_transition("closed", "available")
    assert "dead" in ALLOWED["available"]
