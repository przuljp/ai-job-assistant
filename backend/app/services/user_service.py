"""Business logic for User persistence, decoupled from FastAPI and HTTP concerns."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.models.user import User
from app.schemas.user import UserCreate


def create_user(db: Session, user_data: UserCreate) -> User:
    """Persist a new user.

    Hashing happens here, not in the router: "never store a plain-text
    password" is a rule about how User rows are created, which is exactly
    what the service layer owns. The router only ever sees the raw
    password as part of `UserCreate` and never touches the hash.
    """
    hashed_password = security.hash_password(user_data.password)
    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Fetch a single user by primary key, or None if no such user exists."""
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    """Fetch a single user by their unique email address."""
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    """Fetch a page of users, ordered by id."""
    stmt = select(User).order_by(User.id).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())


def update_user(
    db: Session,
    user_id: int,
    full_name: str | None = None,
    email: str | None = None,
) -> User | None:
    """Apply partial updates to an existing user.

    Only fields explicitly passed (non-None) are changed. Returns None if
    no user with `user_id` exists, so the router can translate that into a
    404 without the service knowing about HTTP.
    """
    user = db.get(User, user_id)
    if user is None:
        return None

    if full_name is not None:
        user.full_name = full_name
    if email is not None:
        user.email = email

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    """Delete a user by id. Returns True if a user was deleted, False if not found."""
    user = db.get(User, user_id)
    if user is None:
        return False

    db.delete(user)
    db.commit()
    return True
