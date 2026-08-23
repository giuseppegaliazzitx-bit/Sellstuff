"""Keys that must never appear on DealPublic or map pin JSON."""

DENYLIST = frozenset(
    {
        "rehab_low_cents",
        "rehab_high_cents",
        "assignment_fee_cents",
        "mao",
        "mao_cents",
        "lockbox_code",
        "contract_executed_at",
        "option_period_ends_at",
        "contract_close_by",
        "deal_structure",
        "jv_partner_name",
        "jv_partner_phone",
        "jv_partner_email",
        "jv_fee_split_pct",
        "hud_fmr_cents",
    }
)


def assert_public_clean(payload: object) -> None:
    blob = _walk(payload)
    hits = sorted(k for k in DENYLIST if k in blob)
    if hits:
        raise AssertionError(f"DealPublic denylist hit: {hits}")


def _walk(obj: object) -> set[str]:
    keys: set[str] = set()
    if isinstance(obj, dict):
        keys.update(obj.keys())
        for v in obj.values():
            keys.update(_walk(v))
    elif isinstance(obj, list):
        for item in obj:
            keys.update(_walk(item))
    return keys
