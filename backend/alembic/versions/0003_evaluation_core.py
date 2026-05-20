"""evaluation core

Revision ID: 0003_evaluation_core
Revises: 0002_assessment_core
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_evaluation_core"
down_revision: str | None = "0002_assessment_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "assessment_answers",
        sa.Column(
            "ai_evaluation",
            sa.JSON(),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
    )

    op.create_table(
        "evaluation_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("ai_test_score", sa.Float(), nullable=False),
        sa.Column("technical_score", sa.Float(), nullable=False),
        sa.Column("communication_score", sa.Float(), nullable=False),
        sa.Column("problem_solving_score", sa.Float(), nullable=False),
        sa.Column("system_design_score", sa.Float(), nullable=False),
        sa.Column("code_quality_score", sa.Float(), nullable=False),
        sa.Column("project_quality_score", sa.Float(), nullable=False),
        sa.Column("academic_score", sa.Float(), nullable=False),
        sa.Column("integrity_score", sa.Float(), nullable=False),
        sa.Column("verified_score", sa.Float(), nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=False),
        sa.Column("recruiter_summary", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id"),
    )
    op.create_index(
        op.f("ix_evaluation_reports_candidate_id"), "evaluation_reports", ["candidate_id"]
    )
    op.create_index(op.f("ix_evaluation_reports_published"), "evaluation_reports", ["published"])
    op.create_index(op.f("ix_evaluation_reports_session_id"), "evaluation_reports", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_evaluation_reports_session_id"), table_name="evaluation_reports")
    op.drop_index(op.f("ix_evaluation_reports_published"), table_name="evaluation_reports")
    op.drop_index(op.f("ix_evaluation_reports_candidate_id"), table_name="evaluation_reports")
    op.drop_table("evaluation_reports")
    op.drop_column("assessment_answers", "ai_evaluation")
