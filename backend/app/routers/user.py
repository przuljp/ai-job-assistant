"""HTTP endpoints for the User resource."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.db.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    existing_user = user_service.get_user_by_email(db, user_data.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    return user_service.create_user(db, user_data)


@router.post(
    "/login",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
)
def login_user(user_data: UserLogin, db: Session = Depends(get_db)) -> UserResponse:
    user = user_service.get_user_by_email(db, user_data.email)

    # Same 401 + same message for "no such user" and "wrong password" —
    # a different message per case would let an attacker enumerate which
    # emails are registered.
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
    )

    if user is None:
        raise invalid_credentials

    if not security.verify_password(user_data.password, user.password_hash):
        raise invalid_credentials

    return user
