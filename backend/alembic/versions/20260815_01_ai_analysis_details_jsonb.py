"""Store structured AI analysis details as JSONB.

Revision ID: 20260815_01
Revises:
Create Date: 2026-08-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260815_01"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM ai_analysis
                WHERE match_score IS NULL OR feedback IS NULL
            ) THEN
                RAISE EXCEPTION
                    'AIAnalysis migration requires manual backfill: '
                    'match_score and feedback must not be null';
            END IF;
        END $$
        """
    )

    op.add_column(
        "ai_analysis",
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute(
        """
        UPDATE ai_analysis
        SET details = jsonb_build_object(
            'summary', feedback,
            'strengths', '[]'::jsonb,
            'missing_skills', '[]'::jsonb,
            'recommendations', '[]'::jsonb
        )
        """
    )
    op.alter_column(
        "ai_analysis",
        "details",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
    )
    op.alter_column(
        "ai_analysis",
        "match_score",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("ai_analysis", "feedback")

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ai_analysis_match_score_check'
                  AND conrelid = 'ai_analysis'::regclass
            ) THEN
                ALTER TABLE ai_analysis
                ADD CONSTRAINT ai_analysis_match_score_check
                CHECK (match_score BETWEEN 0 AND 100);
            END IF;
        END $$
        """
    )


def downgrade() -> None:
    op.add_column(
        "ai_analysis",
        sa.Column("feedback", sa.Text(), nullable=True),
    )
    op.execute(
        """
        UPDATE ai_analysis
        SET feedback = COALESCE(details ->> 'summary', '')
        """
    )
    op.alter_column(
        "ai_analysis",
        "feedback",
        existing_type=sa.Text(),
        nullable=False,
    )
    op.drop_column("ai_analysis", "details")
    op.alter_column(
        "ai_analysis",
        "match_score",
        existing_type=sa.Integer(),
        nullable=True,
    )
