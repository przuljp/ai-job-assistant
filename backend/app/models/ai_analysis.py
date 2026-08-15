from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.job_application import JobApplication
    from app.models.resume import Resume


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"
    __table_args__ = (
        CheckConstraint(
            "match_score BETWEEN 0 AND 100",
            name="ai_analysis_match_score_check",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    job_application_id: Mapped[int] = mapped_column(
        ForeignKey("job_applications.id", ondelete="CASCADE")
    )
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE")
    )
    match_score: Mapped[int] = mapped_column()
    details: Mapped[dict[str, object]] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime | None] = mapped_column(
        server_default=func.now()
    )

    job_application: Mapped["JobApplication"] = relationship(
        back_populates="ai_analyses"
    )
    resume: Mapped["Resume"] = relationship(back_populates="ai_analyses")
