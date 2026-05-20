from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_uuid() -> str:
    return str(uuid4())


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    role: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    tech_stack: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    question_type: Mapped[str] = mapped_column(String(40), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_concepts: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    scoring_rubric: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    follow_up_templates: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(40), index=True, default="created", nullable=False)
    target_role: Mapped[str | None] = mapped_column(String(160), nullable=True)
    experience_level: Mapped[str | None] = mapped_column(String(80), nullable=True)
    selected_difficulty: Mapped[str] = mapped_column(String(40), default="intermediate", nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    session_plan_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    candidate = relationship("CandidateProfile")
    questions = relationship(
        "AssessmentQuestion",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.order_index",
    )
    answers = relationship(
        "AssessmentAnswer",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AssessmentAnswer.order_index",
    )


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    __table_args__ = (UniqueConstraint("session_id", "order_index"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True
    )
    question_bank_id: Mapped[str] = mapped_column(String(80), ForeignKey("question_bank.id"))
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(40), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(40), nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_concepts: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    scoring_rubric: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("AssessmentSession", back_populates="questions")
    bank_question = relationship("QuestionBank")
    answer = relationship(
        "AssessmentAnswer",
        back_populates="assessment_question",
        cascade="all, delete-orphan",
        uselist=False,
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"
    __table_args__ = (UniqueConstraint("assessment_question_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True
    )
    assessment_question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessment_questions.id", ondelete="CASCADE"), index=True
    )
    question_bank_id: Mapped[str] = mapped_column(String(80), ForeignKey("question_bank.id"))
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    code_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answer_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    ai_evaluation: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    session = relationship("AssessmentSession", back_populates="answers")
    assessment_question = relationship("AssessmentQuestion", back_populates="answer")
    bank_question = relationship("QuestionBank")
