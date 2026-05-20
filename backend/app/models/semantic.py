from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.vector_type import FlexibleVector


def new_uuid() -> str:
    return str(uuid4())


class CandidateEmbedding(Base):
    __tablename__ = "candidate_embeddings"
    __table_args__ = (UniqueConstraint("candidate_id", "report_id", "source_type"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), index=True
    )
    report_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("evaluation_reports.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(String(80), default="published_report", nullable=False)
    embedding_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(FlexibleVector(), nullable=True)
    embedding_json: Mapped[list[float]] = mapped_column(JSON, default=list, nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    embedding_provider: Mapped[str] = mapped_column(String(40), nullable=False)
    embedding_dimensions: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    fallback_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate = relationship("CandidateProfile")
    report = relationship("EvaluationReport")


class RecruiterSearch(Base):
    __tablename__ = "recruiter_searches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    recruiter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    filters_json: Mapped[dict] = mapped_column("filters", JSON, default=dict, nullable=False)
    result_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fallback_mode_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    recruiter = relationship("User")
