"""integrity monitoring

Revision ID: 0004_integrity_monitoring
Revises: 0003_evaluation_core
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_integrity_monitoring"
down_revision: str | None = "0003_evaluation_core"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "integrity_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_integrity_events_candidate_id"), "integrity_events", ["candidate_id"])
    op.create_index(op.f("ix_integrity_events_event_type"), "integrity_events", ["event_type"])
    op.create_index(op.f("ix_integrity_events_session_id"), "integrity_events", ["session_id"])
    op.create_index(op.f("ix_integrity_events_severity"), "integrity_events", ["severity"])
    op.create_index(
        "ix_integrity_events_session_occurred_at",
        "integrity_events",
        ["session_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_integrity_events_session_occurred_at", table_name="integrity_events")
    op.drop_index(op.f("ix_integrity_events_severity"), table_name="integrity_events")
    op.drop_index(op.f("ix_integrity_events_session_id"), table_name="integrity_events")
    op.drop_index(op.f("ix_integrity_events_event_type"), table_name="integrity_events")
    op.drop_index(op.f("ix_integrity_events_candidate_id"), table_name="integrity_events")
    op.drop_table("integrity_events")
