"""Argon2id hashing and a bundled common-password denylist."""

from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

MIN_LENGTH = 12

# Worst-of-the-worst. Not a full 10k list; enough to reject lazy choices.
COMMON_PASSWORDS = frozenset(
    {
        "password",
        "password123",
        "password1234",
        "password12345",
        "123456789012",
        "1234567890123",
        "qwertyuiopas",
        "letmein12345",
        "welcome12345",
        "adminadmin12",
        "iloveyou1234",
        "monkey123456",
        "dragon123456",
        "baseball1234",
        "football1234",
        "starwars1234",
        "trustno1!!!!",
        "passw0rd1234",
        "changeme1234",
        "northstar123",
        "northstardispo",
    }
)

_hasher = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)


class PasswordError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def validate_password(plain: str) -> None:
    if len(plain) < MIN_LENGTH:
        raise PasswordError("password_short", f"Password must be at least {MIN_LENGTH} characters")
    if plain.lower() in COMMON_PASSWORDS or plain in COMMON_PASSWORDS:
        raise PasswordError("password_common", "Password is too common")


def hash_password(plain: str) -> str:
    validate_password(plain)
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False
