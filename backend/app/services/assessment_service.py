from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.assessment import (
    AssessmentAnswer,
    AssessmentQuestion,
    AssessmentSession,
    QuestionBank,
)
from app.models.profile import CandidateProfile
from app.models.rag import AssessmentRetrieval, RagDocument
from app.models.user import User
from app.schemas.assessment import (
    AssessmentAnswerRead,
    AssessmentProgress,
    AssessmentQuestionRead,
    AssessmentSessionDetail,
    AssessmentSessionRead,
    CurrentQuestionResponse,
    QuestionBankSummary,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.schemas.rag import RagRetrievalResult
from app.services.rag_retrieval_service import retrieve_for_assessment

ROLE_KEYWORDS = {
    "frontend": ["frontend", "front-end", "react", "next", "ui", "typescript"],
    "backend": ["backend", "back-end", "api", "fastapi", "python", "node"],
    "full_stack": ["full stack", "fullstack", "mern", "product engineer"],
    "ai_ml": ["ai", "ml", "machine learning", "data scientist", "llm"],
    "database": ["database", "postgres", "sql", "data engineer"],
}

REQUIRED_CATEGORIES = [
    "role_specific",
    "technical_fundamentals",
    "debugging",
    "system_design",
    "scenario_reasoning",
    "communication",
]

RAG_SENTINEL_QUESTION_ID = "rag_generated"


@dataclass
class RagAssessmentItem:
    rag_document: RagDocument
    result: RagRetrievalResult
    time_limit_seconds: int

    @property
    def question_text(self) -> str:
        return self.rag_document.content or self.rag_document.title

    @property
    def question_type(self) -> str:
        return self.rag_document.question_type

    @property
    def category(self) -> str:
        return self.rag_document.category

    @property
    def difficulty(self) -> str:
        return self.rag_document.difficulty

    @property
    def expected_concepts(self) -> list[str]:
        return self.rag_document.expected_concepts

    @property
    def scoring_rubric(self) -> dict:
        return self.rag_document.scoring_rubric


AssessmentPlanItem = QuestionBank | RagAssessmentItem


def normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def normalize_profile_role(profile: CandidateProfile) -> str:
    haystack = " ".join(
        [
            normalize_text(profile.target_role),
            normalize_text(profile.experience_level),
            " ".join(profile.skills or []).lower(),
            " ".join(profile.tech_stack or []).lower(),
        ]
    )
    for role, keywords in ROLE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return role
    return "general"


def infer_difficulty(profile: CandidateProfile) -> str:
    experience = normalize_text(profile.experience_level)
    if any(token in experience for token in ["senior", "lead", "principal", "advanced"]):
        return "advanced"
    if any(token in experience for token in ["beginner", "junior", "student", "early"]):
        return "intermediate"
    return "intermediate"


def profile_tags(profile: CandidateProfile) -> set[str]:
    return {tag.lower() for tag in [*(profile.skills or []), *(profile.tech_stack or [])]}


def validate_profile_ready(profile: CandidateProfile | None) -> CandidateProfile:
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found",
        )
    if (
        not profile.profile_complete
        or not profile.target_role
        or not profile.skills
        or not profile.tech_stack
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate profile must be complete before starting assessment",
        )
    return profile


def question_score(
    question: QuestionBank,
    role: str,
    difficulty: str,
    tags: set[str],
    required_category: str | None = None,
) -> tuple[int, str]:
    score = 0
    if question.role == role:
        score += 4
    if question.role == "general":
        score += 1
    overlaps = tags.intersection({tag.lower() for tag in question.tech_stack or []})
    score += len(overlaps) * 3
    if question.difficulty == difficulty:
        score += 2
    if question.category == required_category:
        score += 1
    return score, question.id


def choose_best_question(
    questions: Iterable[QuestionBank],
    selected_ids: set[str],
    role: str,
    difficulty: str,
    tags: set[str],
    required_category: str | None,
) -> QuestionBank | None:
    candidates = [
        question
        for question in questions
        if question.id not in selected_ids and question.id != RAG_SENTINEL_QUESTION_ID
    ]
    if required_category:
        category_candidates = [question for question in candidates if question.category == required_category]
        if category_candidates:
            candidates = category_candidates
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda question: question_score(question, role, difficulty, tags, required_category),
        reverse=True,
    )[0]


def ensure_rag_sentinel_question(db: Session) -> QuestionBank:
    sentinel = db.get(QuestionBank, RAG_SENTINEL_QUESTION_ID)
    if sentinel is None:
        sentinel = QuestionBank(
            id=RAG_SENTINEL_QUESTION_ID,
            role="internal",
            category="internal",
            tech_stack=[],
            difficulty="internal",
            question_type="internal",
            question_text="[internal] RAG assessment source placeholder",
            expected_concepts=[],
            scoring_rubric={},
            time_limit_seconds=0,
            follow_up_templates=[],
        )
        db.add(sentinel)
        db.flush()
    return sentinel


def build_curated_session_plan(db: Session, profile: CandidateProfile) -> tuple[list[QuestionBank], dict]:
    role = normalize_profile_role(profile)
    difficulty = infer_difficulty(profile)
    tags = profile_tags(profile)
    questions = db.scalars(select(QuestionBank).where(QuestionBank.id != RAG_SENTINEL_QUESTION_ID)).all()

    if len(questions) < 6:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question bank must contain at least 6 questions before starting assessment",
        )

    selected: list[QuestionBank] = []
    selected_ids: set[str] = set()
    for category in REQUIRED_CATEGORIES:
        question = choose_best_question(questions, selected_ids, role, difficulty, tags, category)
        if question is not None:
            selected.append(question)
            selected_ids.add(question.id)

    while len(selected) < 6:
        question = choose_best_question(questions, selected_ids, role, difficulty, tags, None)
        if question is None:
            break
        selected.append(question)
        selected_ids.add(question.id)

    metadata = {
        "normalized_role": role,
        "selected_difficulty": difficulty,
        "profile_target_role": profile.target_role,
        "profile_skills": profile.skills,
        "profile_tech_stack": profile.tech_stack,
        "category_plan": [question.category for question in selected],
    }
    return selected[:6], metadata


def configured_min_similarity(value: float) -> float:
    if value <= 1:
        return value * 100
    return value


def rag_time_limit_seconds(document: RagDocument) -> int:
    if document.question_type == "coding":
        return 900
    if document.question_type in {"system_design", "debugging", "scenario"}:
        return 600
    if document.question_type in {"conceptual", "communication"}:
        return 420
    return 300


def slot_for_result(result: RagRetrievalResult) -> str:
    category_haystack = " ".join(
        [
            result.category,
            result.question_type,
            result.title,
        ]
    ).lower()
    if "communication" in category_haystack:
        return "communication"
    if "debug" in category_haystack:
        return "debugging"
    if any(token in category_haystack for token in ["full-stack", "fullstack", "integration", "architecture"]):
        return "full_stack"
    if any(token in category_haystack for token in ["database", "postgres", "sql"]):
        return "database"
    if any(token in category_haystack for token in ["backend", "api", "fastapi"]):
        return "backend"
    if any(token in category_haystack for token in ["frontend", "react", "next"]):
        return "frontend"
    if "system_design" in category_haystack or "system-design" in category_haystack:
        return "communication"

    haystack = " ".join(
        [
            result.category,
            result.question_type,
            result.title,
            " ".join(result.tech_stack),
        ]
    ).lower()
    if any(token in haystack for token in ["frontend", "react", "next"]):
        return "frontend"
    if any(token in haystack for token in ["backend", "api", "fastapi"]):
        return "backend"
    if any(token in haystack for token in ["database", "postgres", "sql"]):
        return "database"
    if any(token in haystack for token in ["full-stack", "fullstack", "integration", "architecture"]):
        return "full_stack"
    if "debug" in haystack or "scenario" in haystack:
        return "debugging"
    if "communication" in haystack or "system_design" in haystack or "system-design" in haystack:
        return "communication"
    return "general"


def balanced_rag_selection(
    db: Session,
    results: list[RagRetrievalResult],
    target_role: str | None,
) -> tuple[list[RagAssessmentItem], list[dict]]:
    if normalize_text(target_role).find("full") >= 0:
        slots = ["frontend", "backend", "database", "full_stack", "debugging", "communication"]
    elif normalize_text(target_role).find("front") >= 0:
        slots = ["frontend", "frontend", "debugging", "full_stack", "communication"]
    elif normalize_text(target_role).find("back") >= 0:
        slots = ["backend", "backend", "database", "debugging", "communication"]
    elif any(token in normalize_text(target_role) for token in ["ai", "ml", "machine"]):
        slots = ["general", "debugging", "communication"]
    else:
        slots = ["frontend", "backend", "database", "debugging", "communication"]

    documents = {
        document.id: document
        for document in db.scalars(select(RagDocument).where(RagDocument.id.in_([item.document_id for item in results])))
    }
    selected: list[RagAssessmentItem] = []
    selected_ids: set[str] = set()
    slot_allocation: list[dict] = []

    for slot in slots:
        match = next(
            (
                result
                for result in results
                if result.document_id not in selected_ids and slot_for_result(result) == slot
            ),
            None,
        )
        if match is None:
            continue
        document = documents.get(match.document_id)
        if document is None:
            continue
        selected.append(
            RagAssessmentItem(
                rag_document=document,
                result=match,
                time_limit_seconds=rag_time_limit_seconds(document),
            )
        )
        selected_ids.add(match.document_id)
        slot_allocation.append({"slot": slot, "rag_document_id": match.document_id})

    for result in results:
        if len(selected) >= 6:
            break
        if result.document_id in selected_ids:
            continue
        document = documents.get(result.document_id)
        if document is None:
            continue
        selected.append(
            RagAssessmentItem(
                rag_document=document,
                result=result,
                time_limit_seconds=rag_time_limit_seconds(document),
            )
        )
        selected_ids.add(result.document_id)
        slot_allocation.append({"slot": "best_available", "rag_document_id": result.document_id})

    return selected[:6], slot_allocation


def build_rag_session_plan(db: Session, profile: CandidateProfile) -> tuple[list[RagAssessmentItem], dict]:
    settings = get_settings()
    difficulty = infer_difficulty(profile) or settings.rag_default_difficulty
    response = retrieve_for_assessment(
        db,
        target_role=profile.target_role,
        tech_stack=profile.tech_stack or [],
        skills=profile.skills or [],
        experience_level=profile.experience_level,
        difficulty=difficulty,
        limit=max(12, settings.rag_top_k),
        min_similarity=configured_min_similarity(settings.rag_min_similarity),
    )
    selected, slot_allocation = balanced_rag_selection(db, response.results, profile.target_role)
    if len(selected) < 4:
        raise RuntimeError(f"RAG returned insufficient usable assessment documents: {len(selected)}")

    metadata = {
        "question_source": "rag",
        "normalized_role": normalize_profile_role(profile),
        "selected_difficulty": difficulty,
        "profile_target_role": profile.target_role,
        "profile_skills": profile.skills,
        "profile_tech_stack": profile.tech_stack,
        "category_plan": [item.category for item in selected],
        "rag": {
            "query_text": response.query_text,
            "fallback_used": response.fallback_used,
            "provider_metadata": response.provider_metadata.model_dump(),
            "retrieved_document_ids": [item.document_id for item in response.results],
            "selected_document_ids": [item.rag_document.id for item in selected],
            "slot_allocation": slot_allocation,
            "selected_scores": {
                item.rag_document.id: item.result.score.model_dump() for item in selected
            },
            "why_matched": {
                item.rag_document.id: item.result.why_matched for item in selected
            },
        },
    }
    return selected, metadata


def build_session_plan(db: Session, profile: CandidateProfile) -> tuple[list[AssessmentPlanItem], dict]:
    settings = get_settings()
    if not settings.enable_rag_assessment:
        selected, metadata = build_curated_session_plan(db, profile)
        metadata["question_source"] = "question_bank"
        return selected, metadata

    try:
        return build_rag_session_plan(db, profile)
    except Exception as exc:
        if not settings.enable_rag_curated_fallback:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"RAG assessment unavailable: {exc}",
            ) from exc
        selected, metadata = build_curated_session_plan(db, profile)
        metadata["question_source"] = "question_bank"
        metadata["rag_fallback_reason"] = str(exc)
        return selected, metadata


def get_candidate_profile_for_user(db: Session, user: User) -> CandidateProfile | None:
    return db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))


def latest_session(db: Session, profile: CandidateProfile) -> AssessmentSession | None:
    return db.scalar(
        select(AssessmentSession)
        .where(AssessmentSession.candidate_id == profile.id)
        .order_by(desc(AssessmentSession.created_at))
    )


def session_for_user(db: Session, session_id: str, user: User) -> AssessmentSession:
    profile = get_candidate_profile_for_user(db, user)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found",
        )
    session = db.scalar(
        select(AssessmentSession).where(
            AssessmentSession.id == session_id,
            AssessmentSession.candidate_id == profile.id,
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment session not found",
        )
    return session


def current_question(session: AssessmentSession) -> AssessmentQuestion | None:
    answered_question_ids = {answer.assessment_question_id for answer in session.answers}
    for question in sorted(session.questions, key=lambda item: item.order_index):
        if question.id not in answered_question_ids:
            return question
    return None


def make_progress(session: AssessmentSession) -> AssessmentProgress:
    answered = len(session.answers)
    return AssessmentProgress(
        answered=answered,
        total=session.total_questions,
        current_order_index=session.current_order_index,
        is_complete=answered >= session.total_questions and session.total_questions > 0,
    )


def answer_read(answer: AssessmentAnswer) -> AssessmentAnswerRead:
    return AssessmentAnswerRead(
        id=answer.id,
        assessment_question_id=answer.assessment_question_id,
        question_bank_id=answer.question_bank_id,
        order_index=answer.order_index,
        answer_text=answer.answer_text,
        code_text=answer.code_text,
        duration_seconds=answer.duration_seconds,
        metadata=answer.answer_metadata,
    )


def session_detail(session: AssessmentSession) -> AssessmentSessionDetail:
    return AssessmentSessionDetail(
        session=AssessmentSessionRead.model_validate(session),
        questions=[AssessmentQuestionRead.model_validate(question) for question in session.questions],
        answers=[answer_read(answer) for answer in session.answers],
        current_question=(
            AssessmentQuestionRead.model_validate(current_question(session))
            if current_question(session) is not None
            else None
        ),
        progress=make_progress(session),
    )


def start_assessment_session(db: Session, user: User, force_new: bool = False) -> AssessmentSessionDetail:
    profile = validate_profile_ready(get_candidate_profile_for_user(db, user))
    existing = latest_session(db, profile)
    if existing is not None and existing.status == "in_progress" and not force_new:
        return session_detail(existing)
    if existing is not None and existing.status == "in_progress" and force_new:
        existing.status = "abandoned"

    selected_questions, metadata = build_session_plan(db, profile)
    now = datetime.now(timezone.utc)
    session = AssessmentSession(
        candidate_id=profile.id,
        status="in_progress",
        target_role=profile.target_role,
        experience_level=profile.experience_level,
        selected_difficulty=metadata["selected_difficulty"],
        started_at=now,
        current_order_index=0,
        total_questions=len(selected_questions),
        session_plan_metadata=metadata,
    )
    db.add(session)
    db.flush()

    if metadata.get("question_source") == "rag":
        ensure_rag_sentinel_question(db)

    for index, question in enumerate(selected_questions):
        question_bank_id = (
            question.id if isinstance(question, QuestionBank) else RAG_SENTINEL_QUESTION_ID
        )
        db.add(
            AssessmentQuestion(
                session_id=session.id,
                question_bank_id=question_bank_id,
                order_index=index,
                question_text=question.question_text,
                question_type=question.question_type,
                category=question.category,
                difficulty=question.difficulty,
                time_limit_seconds=question.time_limit_seconds,
                expected_concepts=question.expected_concepts,
                scoring_rubric=question.scoring_rubric,
            )
        )
    if metadata.get("question_source") == "rag":
        rag_metadata = metadata.get("rag") or {}
        db.add(
            AssessmentRetrieval(
                session_id=session.id,
                candidate_id=profile.id,
                query_text=rag_metadata.get("query_text", ""),
                retrieved_document_ids=rag_metadata.get("retrieved_document_ids", []),
                selected_question_ids=rag_metadata.get("selected_document_ids", []),
                selected_rubric_ids=[],
                metadata_json={
                    "source_types": ["question", "coding_task"],
                    "fallback_used": rag_metadata.get("fallback_used", False),
                    "provider_metadata": rag_metadata.get("provider_metadata", {}),
                    "slot_allocation": rag_metadata.get("slot_allocation", []),
                    "selected_scores": rag_metadata.get("selected_scores", {}),
                    "why_matched": rag_metadata.get("why_matched", {}),
                },
            )
        )
    db.commit()
    db.refresh(session)
    return session_detail(session)


def submit_answer(
    db: Session,
    session: AssessmentSession,
    payload: SubmitAnswerRequest,
) -> SubmitAnswerResponse:
    if session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Answers can only be submitted to an in-progress session",
        )

    question = current_question(session)
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No current question remains. Finish the session.",
        )
    if payload.assessment_question_id != question.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Answer must target the current question",
        )
    if question.answer is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question already has an answer",
        )
    answer_text = payload.answer_text.strip() if payload.answer_text else None
    code_text = payload.code_text.strip() if payload.code_text else None
    if not answer_text and not code_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submit answer_text, code_text, or both",
        )

    answer = AssessmentAnswer(
        session_id=session.id,
        assessment_question_id=question.id,
        question_bank_id=question.question_bank_id,
        order_index=question.order_index,
        answer_text=answer_text,
        code_text=code_text,
        duration_seconds=payload.duration_seconds,
        answer_metadata=payload.metadata,
    )
    db.add(answer)
    session.current_order_index = min(question.order_index + 1, session.total_questions)
    db.commit()
    db.refresh(session)
    db.refresh(answer)

    next_question = current_question(session)
    return SubmitAnswerResponse(
        answer=answer_read(answer),
        next_question=(
            AssessmentQuestionRead.model_validate(next_question) if next_question is not None else None
        ),
        session=AssessmentSessionRead.model_validate(session),
        progress=make_progress(session),
    )


def finish_session(db: Session, session: AssessmentSession) -> AssessmentSessionDetail:
    if session.status == "completed":
        return session_detail(session)
    if session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only an in-progress session can be finished",
        )
    if not session.answers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submit at least one answer before finishing the session",
        )
    session.status = "completed"
    session.finished_at = datetime.now(timezone.utc)
    session.current_order_index = session.total_questions
    db.commit()
    db.refresh(session)
    return session_detail(session)


def current_question_response(session: AssessmentSession) -> CurrentQuestionResponse:
    question = current_question(session)
    return CurrentQuestionResponse(
        session_id=session.id,
        current_question=(
            AssessmentQuestionRead.model_validate(question) if question is not None else None
        ),
        progress=make_progress(session),
    )


def question_bank_summary(db: Session) -> QuestionBankSummary:
    def grouped_counts(column) -> dict[str, int]:
        rows = db.execute(
            select(column, func.count())
            .where(QuestionBank.id != RAG_SENTINEL_QUESTION_ID)
            .group_by(column)
        ).all()
        return {str(key): int(count) for key, count in rows}

    total = (
        db.scalar(
            select(func.count())
            .select_from(QuestionBank)
            .where(QuestionBank.id != RAG_SENTINEL_QUESTION_ID)
        )
        or 0
    )
    return QuestionBankSummary(
        total_questions=int(total),
        count_by_role=grouped_counts(QuestionBank.role),
        count_by_category=grouped_counts(QuestionBank.category),
        count_by_difficulty=grouped_counts(QuestionBank.difficulty),
    )
