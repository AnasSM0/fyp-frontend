"""rag documents

Revision ID: 0007_rag_documents
Revises: 0006_marketplace_lifecycle
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_rag_documents"
down_revision: str | None = "0006_marketplace_lifecycle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rag_documents",
        sa.Column("id", sa.String(length=120), nullable=False),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=120), nullable=False),
        sa.Column("specialization", sa.String(length=120), nullable=True),
        sa.Column("difficulty", sa.String(length=40), nullable=False),
        sa.Column("experience_level", sa.String(length=80), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("question_type", sa.String(length=40), nullable=False),
        sa.Column("tech_stack", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("expected_concepts", sa.JSON(), nullable=False),
        sa.Column("scoring_rubric", sa.JSON(), nullable=False),
        sa.Column("sample_followups", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("raw_json", sa.JSON(), nullable=False),
        sa.Column("embedding_text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("embedding_json", sa.JSON(), nullable=False),
        sa.Column("embedding_provider", sa.String(length=40), nullable=True),
        sa.Column("embedding_model", sa.String(length=120), nullable=True),
        sa.Column("embedding_dimensions", sa.Integer(), nullable=True),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE rag_documents ALTER COLUMN embedding TYPE vector USING embedding::vector")
    op.create_index(op.f("ix_rag_documents_source_type"), "rag_documents", ["source_type"])
    op.create_index(op.f("ix_rag_documents_role"), "rag_documents", ["role"])
    op.create_index(op.f("ix_rag_documents_difficulty"), "rag_documents", ["difficulty"])
    op.create_index(op.f("ix_rag_documents_experience_level"), "rag_documents", ["experience_level"])
    op.create_index(op.f("ix_rag_documents_category"), "rag_documents", ["category"])
    op.create_index(op.f("ix_rag_documents_embedding_dimensions"), "rag_documents", ["embedding_dimensions"])
    op.create_index(op.f("ix_rag_documents_is_active"), "rag_documents", ["is_active"])

    op.create_table(
        "assessment_retrievals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("retrieved_document_ids", sa.JSON(), nullable=False),
        sa.Column("selected_question_ids", sa.JSON(), nullable=False),
        sa.Column("selected_rubric_ids", sa.JSON(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessment_retrievals_session_id"), "assessment_retrievals", ["session_id"])
    op.create_index(op.f("ix_assessment_retrievals_candidate_id"), "assessment_retrievals", ["candidate_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_assessment_retrievals_candidate_id"), table_name="assessment_retrievals")
    op.drop_index(op.f("ix_assessment_retrievals_session_id"), table_name="assessment_retrievals")
    op.drop_table("assessment_retrievals")
    op.drop_index(op.f("ix_rag_documents_is_active"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_embedding_dimensions"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_category"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_experience_level"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_difficulty"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_role"), table_name="rag_documents")
    op.drop_index(op.f("ix_rag_documents_source_type"), table_name="rag_documents")
    op.drop_table("rag_documents")
