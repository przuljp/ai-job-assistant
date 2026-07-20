from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class all ORM models will inherit from."""
    pass


# Imported after Base is defined so each model can subclass it. This registers
# every model's table on Base.metadata, which is what Base.metadata.create_all()
# and Alembic's autogenerate need to see the full schema.
from app.models.user import User  # noqa: E402, F401
from app.models.job_application import JobApplication  # noqa: E402, F401
from app.models.resume import Resume  # noqa: E402, F401
from app.models.ai_analysis import AIAnalysis  # noqa: E402, F401
