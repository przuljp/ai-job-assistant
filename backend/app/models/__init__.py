# Every model is imported here so that importing this package (or anything
# that imports it, e.g. Alembic's env.py) registers all tables on
# Base.metadata. Models only need `app.db.base`, never this package, so this
# stays a one-way dependency with no import cycle.
from app.models.user import User
from app.models.job_application import JobApplication
from app.models.resume import Resume
from app.models.ai_analysis import AIAnalysis

__all__ = ["User", "JobApplication", "Resume", "AIAnalysis"]
