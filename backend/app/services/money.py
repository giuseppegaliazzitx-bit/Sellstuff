def mao_cents(arv_cents: int, rehab_cents: int, assignment_fee_cents: int) -> int:
    return int(arv_cents * 70 // 100 - rehab_cents - assignment_fee_cents)


def format_usd(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    n = abs(cents)
    dollars, rem = divmod(n, 100)
    return f"{sign}${dollars:,}.{rem:02d}"


def price_label(cents: int) -> str:
    """$69900 → $70K."""
    dollars = cents / 100
    if dollars >= 1_000_000:
        return f"${dollars / 1_000_000:.1f}M".replace(".0M", "M")
    k = round(dollars / 1000)
    return f"${k}K"
