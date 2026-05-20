"""semantic matching

Revision ID: 0005_semantic_matching
Revises: 0004_integrity_monitoring
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_semantic_matching"
down_revision: str | None = "0004_integrity_monitoring"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "candidate_embeddings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("report_id", sa.String(length=36), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=False),
        sa.Column("embedding_text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=True),
        sa.Column("embedding_json", sa.JSON(), nullable=False),
        sa.Column("embedding_model", sa.String(length=120), nullable=False),
        sa.Column("embedding_provider", sa.String(length=40), nullable=False),
        sa.Column("embedding_dimensions", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["report_id"], ["evaluation_reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "report_id", "source_type"),
    )
    op.execute("ALTER TABLE candidate_embeddings ALTER COLUMN embedding TYPE vector USING embedding::vector")
    op.create_index(
        op.f("ix_candidate_embeddings_candidate_id"),
        "candidate_embeddings",
        ["candidate_id"],
    )
    op.create_index(
        op.f("ix_candidate_embeddings_report_id"),
        "candidate_embeddings",
        ["report_id"],
    )
    op.create_index(
        op.f("ix_candidate_embeddings_embedding_model"),
        "candidate_embeddings",
        ["embedding_model"],
    )
    op.create_index(
        op.f("ix_candidate_embeddings_embedding_dimensions"),
        "candidate_embeddings",
        ["embedding_dimensions"],
    )

    op.create_table(
        "recruiter_searches",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("recruiter_id", sa.String(length=36), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("filters", sa.JSON(), nullable=False),
        sa.Column("result_count", sa.Integer(), nullable=False),
        sa.Column("fallback_mode_used", sa.Boolean(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["recruiter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recruiter_searches_recruiter_id"), "recruiter_searches", ["recruiter_id"])
    op.create_index(op.f("ix_recruiter_searches_created_at"), "recruiter_searches", ["created_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_recruiter_searches_created_at"), table_name="recruiter_searches")
    op.drop_index(op.f("ix_recruiter_searches_recruiter_id"), table_name="recruiter_searches")
    op.drop_table("recruiter_searches")
    op.drop_index(
        op.f("ix_candidate_embeddings_embedding_dimensions"), table_name="candidate_embeddings"
    )
    op.drop_index(op.f("ix_candidate_embeddings_embedding_model"), table_name="candidate_embeddings")
    op.drop_index(op.f("ix_candidate_embeddings_report_id"), table_name="candidate_embeddings")
    op.drop_index(op.f("ix_candidate_embeddings_candidate_id"), table_name="candidate_embeddings")
    op.drop_table("candidate_embeddings")
