from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.job_application import JobApplication
    from app.models.resume import Resume


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_application_id: Mapped[int] = mapped_column(ForeignKey("job_applications.id"))
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id"))
    match_score: Mapped[int | None] = mapped_column()
    feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime.datetime] = mapped_column(server_default=func.now())

    job_application: Mapped["JobApplication"] = relationship(
        back_populates="ai_analyses"
    )
    resume: Mapped["Resume"] = relationship(back_populates="ai_analyses")
