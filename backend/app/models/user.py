from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.job_application import JobApplication
    from app.models.resume import Resume


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime.datetime | None] = mapped_column(
        server_default=func.now()
    )

    job_applications: Mapped[list["JobApplication"]] = relationship(
        back_populates="user"
    )
    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")
