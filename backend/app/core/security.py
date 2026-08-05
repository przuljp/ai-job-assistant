"""Password hashing and JWT authentication utilities.

Split into two parts:
  - Password hashing and JWT encode/decode: pure functions, no FastAPI or
    database knowledge, easy to unit-test in isolation.
  - `get_current_user`: a FastAPI dependency, so it necessarily knows about
    `Depends`/`HTTPException` and the user service — it's the piece that
    wires the pure JWT logic to the database.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

load_dotenv()

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# JWT configuration
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY is not set. Define it in your .env file.")

# HS256 is a symmetric algorithm: the same SECRET_KEY signs and verifies, which
# is the right fit here since only this one API issues and checks its own
# tokens (no separate auth server, no third party ever needs to verify them
# without holding the secret).
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# How long an access token stays valid after issuance. Short-lived by design:
# since there's no revocation list, a leaked token is exploitable until it
# expires, so this stays small rather than e.g. days or weeks.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


# ---------------------------------------------------------------------------
# JWT encode / decode (pure — no FastAPI, no database)
# ---------------------------------------------------------------------------


def create_access_token(user_id: int) -> str:
    """Issue a signed JWT access token identifying `user_id`."""
    now = datetime.now(timezone.utc)
    payload = {
        # "subject" — the standard claim for "who this token is about". Must
        # be a string per the JWT spec, so the int id is cast.
        "sub": str(user_id),
        # "issued at" — when the token was minted. Not required for
        # validation, but useful for auditing/debugging token age.
        "iat": now,
        # "expiration" — PyJWT checks this automatically on decode and
        # raises ExpiredSignatureError once it's passed.
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> int | None:
    """Validate a JWT and return the user id it identifies, or None if the
    token is missing, malformed, expired, or has an invalid signature."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None

    subject = payload.get("sub")
    if subject is None:
        return None

    try:
        return int(subject)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

# Extracts the "Authorization: Bearer <token>" header. Deliberately HTTPBearer
# rather than OAuth2PasswordBearer: the latter's Swagger "Authorize" flow
# assumes a form-encoded username/password token endpoint, which doesn't
# match this project's JSON-body /users/login. HTTPBearer just expects a
# bearer token and doesn't assume how it was obtained.
_bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the User identified by the request's bearer token.

    Raises 401 if the token is missing, invalid, expired, or no longer
    matches a real user (e.g. the account was deleted after the token was
    issued).
    """
    # Imported here, not at module level: user_service imports this module
    # for hash_password/verify_password, so a top-level import here would
    # create a circular import. By call time both modules are fully loaded.
    from app.services import user_service

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = verify_access_token(credentials.credentials)
    if user_id is None:
        raise invalid_credentials

    user = user_service.get_user_by_id(db, user_id)
    if user is None:
        raise invalid_credentials

    return user
