"""Password hashing utilities. No FastAPI, service, or database knowledge lives here."""

from __future__ import annotations

from pwdlib import PasswordHash

# Built once at import time: constructing a PasswordHash resolves and configures
# the underlying Argon2 parameters, so it's reused across calls rather than
# rebuilt on every hash/verify.
_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash a plain-text password using Argon2id. Returns a self-describing hash string."""
    return _password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a previously stored Argon2 hash."""
    return _password_hash.verify(plain_password, hashed_password)
