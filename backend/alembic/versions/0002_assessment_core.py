"""assessment core

Revision ID: 0002_assessment_core
Revises: 0001_phase1_foundation
Create Date: 2026-05-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_assessment_core"
down_revision: str | None = "0001_phase1_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "question_bank",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("tech_stack", sa.JSON(), nullable=False),
        sa.Column("difficulty", sa.String(length=40), nullable=False),
        sa.Column("question_type", sa.String(length=40), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("expected_concepts", sa.JSON(), nullable=False),
        sa.Column("scoring_rubric", sa.JSON(), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("follow_up_templates", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_question_bank_category"), "question_bank", ["category"])
    op.create_index(op.f("ix_question_bank_difficulty"), "question_bank", ["difficulty"])
    op.create_index(op.f("ix_question_bank_role"), "question_bank", ["role"])

    op.create_table(
        "assessment_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("target_role", sa.String(length=160), nullable=True),
        sa.Column("experience_level", sa.String(length=80), nullable=True),
        sa.Column("selected_difficulty", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_order_index", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("session_plan_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assessment_sessions_candidate_id"), "assessment_sessions", ["candidate_id"]
    )
    op.create_index(op.f("ix_assessment_sessions_status"), "assessment_sessions", ["status"])

    op.create_table(
        "assessment_questions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("question_bank_id", sa.String(length=80), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=40), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("difficulty", sa.String(length=40), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("expected_concepts", sa.JSON(), nullable=False),
        sa.Column("scoring_rubric", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["question_bank_id"], ["question_bank.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "order_index"),
    )
    op.create_index(
        op.f("ix_assessment_questions_session_id"), "assessment_questions", ["session_id"]
    )

    op.create_table(
        "assessment_answers",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("assessment_question_id", sa.String(length=36), nullable=False),
        sa.Column("question_bank_id", sa.String(length=80), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("code_text", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["assessment_question_id"], ["assessment_questions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["question_bank_id"], ["question_bank.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assessment_question_id"),
    )
    op.create_index(
        op.f("ix_assessment_answers_assessment_question_id"),
        "assessment_answers",
        ["assessment_question_id"],
    )
    op.create_index(op.f("ix_assessment_answers_session_id"), "assessment_answers", ["session_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_assessment_answers_session_id"), table_name="assessment_answers")
    op.drop_index(
        op.f("ix_assessment_answers_assessment_question_id"), table_name="assessment_answers"
    )
    op.drop_table("assessment_answers")
    op.drop_index(op.f("ix_assessment_questions_session_id"), table_name="assessment_questions")
    op.drop_table("assessment_questions")
    op.drop_index(op.f("ix_assessment_sessions_status"), table_name="assessment_sessions")
    op.drop_index(op.f("ix_assessment_sessions_candidate_id"), table_name="assessment_sessions")
    op.drop_table("assessment_sessions")
    op.drop_index(op.f("ix_question_bank_role"), table_name="question_bank")
    op.drop_index(op.f("ix_question_bank_difficulty"), table_name="question_bank")
    op.drop_index(op.f("ix_question_bank_category"), table_name="question_bank")
    op.drop_table("question_bank")
