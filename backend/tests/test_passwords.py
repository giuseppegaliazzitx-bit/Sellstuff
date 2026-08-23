"""P1-T1."""

from app.core.passwords import PasswordError, hash_password, verify_password


def test_argon2_hash_and_verify() -> None:
    hashed = hash_password("correct-horse-battery")
    assert hashed.startswith("$argon2")
    assert verify_password("correct-horse-battery", hashed) is True
    assert verify_password("wrong-password-xx", hashed) is False


def test_rejects_short_and_common() -> None:
    try:
        hash_password("short")
        raise AssertionError("expected PasswordError")
    except PasswordError as exc:
        assert exc.code == "password_short"
    try:
        hash_password("password1234")
        raise AssertionError("expected PasswordError")
    except PasswordError as exc:
        assert exc.code == "password_common"
