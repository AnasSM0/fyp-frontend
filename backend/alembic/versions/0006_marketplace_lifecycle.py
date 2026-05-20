"""marketplace lifecycle

Revision ID: 0006_marketplace_lifecycle
Revises: 0005_semantic_matching
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_marketplace_lifecycle"
down_revision: str | None = "0005_semantic_matching"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("recruiter_id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recruiter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recruiter_id", "candidate_id"),
    )
    op.create_index(op.f("ix_saved_candidates_recruiter_id"), "saved_candidates", ["recruiter_id"])
    op.create_index(op.f("ix_saved_candidates_candidate_id"), "saved_candidates", ["candidate_id"])
    op.create_index(op.f("ix_saved_candidates_created_at"), "saved_candidates", ["created_at"])

    op.create_table(
        "invites",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("recruiter_id", sa.String(length=36), nullable=False),
        sa.Column("company_id", sa.String(length=36), nullable=True),
        sa.Column("role_title", sa.String(length=160), nullable=False),
        sa.Column("normalized_role_title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("salary_range", sa.String(length=120), nullable=True),
        sa.Column("opportunity_type", sa.String(length=80), nullable=False),
        sa.Column("interview_window", sa.String(length=160), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("response_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["company_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recruiter_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invites_candidate_id"), "invites", ["candidate_id"])
    op.create_index(op.f("ix_invites_recruiter_id"), "invites", ["recruiter_id"])
    op.create_index(op.f("ix_invites_company_id"), "invites", ["company_id"])
    op.create_index(op.f("ix_invites_status"), "invites", ["status"])
    op.create_index(op.f("ix_invites_normalized_role_title"), "invites", ["normalized_role_title"])
    op.create_index(op.f("ix_invites_created_at"), "invites", ["created_at"])

    op.create_table(
        "activity_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_events_user_id"), "activity_events", ["user_id"])
    op.create_index(op.f("ix_activity_events_actor_user_id"), "activity_events", ["actor_user_id"])
    op.create_index(op.f("ix_activity_events_event_type"), "activity_events", ["event_type"])
    op.create_index(op.f("ix_activity_events_created_at"), "activity_events", ["created_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_events_created_at"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_event_type"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_actor_user_id"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_user_id"), table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_index(op.f("ix_invites_created_at"), table_name="invites")
    op.drop_index(op.f("ix_invites_normalized_role_title"), table_name="invites")
    op.drop_index(op.f("ix_invites_status"), table_name="invites")
    op.drop_index(op.f("ix_invites_company_id"), table_name="invites")
    op.drop_index(op.f("ix_invites_recruiter_id"), table_name="invites")
    op.drop_index(op.f("ix_invites_candidate_id"), table_name="invites")
    op.drop_table("invites")
    op.drop_index(op.f("ix_saved_candidates_created_at"), table_name="saved_candidates")
    op.drop_index(op.f("ix_saved_candidates_candidate_id"), table_name="saved_candidates")
    op.drop_index(op.f("ix_saved_candidates_recruiter_id"), table_name="saved_candidates")
    op.drop_table("saved_candidates")
