from app.core.errors import AppError

ALLOWED = {
    "coming_soon": {"available", "dead"},
    "available": {"pending", "dead"},
    "pending": {"under_contract", "available", "dead"},
    "under_contract": {"assigned", "pending", "dead"},
    "assigned": {"closed"},
    "closed": set(),
    "dead": set(),
}

CLIENT_VISIBLE = {"available", "pending"}


def assert_transition(current: str, target: str) -> None:
    if target not in ALLOWED.get(current, set()):
        raise AppError(409, "status_transition_invalid", f"{current} → {target} is not allowed")
