from dataclasses import dataclass
import hashlib
import logging
from typing import Iterable
from uuid import uuid4
from datetime import datetime, timezone

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
from app.schemas.rag import RagRetrievalResult, RagScoreBreakdown
from app.services.code_execution_service import public_execution_metadata, sanitized_scoring_rubric
from app.services.rag_retrieval_service import retrieve_for_assessment

logger = logging.getLogger(__name__)

ROLE_KEYWORDS = {
    "frontend": ["frontend", "front-end", "react", "next", "ui", "typescript"],
    "backend": ["backend", "back-end", "api", "fastapi", "python", "node"],
    "full_stack": ["full stack", "fullstack", "mern", "product engineer"],
    "ai_ml": ["ai", "ml", "machine learning", "data scientist", "llm"],
    "database": ["database", "postgres", "sql", "data engineer"],
}

ROLE_PRIORITY = ["ai_ml", "full_stack", "backend", "frontend", "database"]

REQUIRED_CATEGORIES = [
    "role_specific",
    "technical_fundamentals",
    "debugging",
    "system_design",
    "scenario_reasoning",
    "communication",
]

RAG_SENTINEL_QUESTION_ID = "rag_generated"

ASSESSMENT_BUCKET_PLAN = [
    "role_conceptual",
    "role_conceptual",
    "system_design",
    "debugging",
    "coding",
    "communication",
]

DIFFICULTY_PLANS = {
    "entry": ["beginner", "beginner", "intermediate", "intermediate", "intermediate", "beginner"],
    "intermediate": ["intermediate", "intermediate", "intermediate", "intermediate", "advanced", "intermediate"],
    "advanced": ["advanced", "intermediate", "advanced", "advanced", "advanced", "intermediate"],
}

DIFFICULTY_RANK = {"beginner": 0, "easy": 0, "entry": 0, "intermediate": 1, "medium": 1, "advanced": 2, "hard": 2}


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
        rubric = dict(self.rag_document.scoring_rubric or {})
        metadata = self.rag_document.metadata_json or {}
        if "execution_supported" in metadata:
            execution_supported = bool(metadata.get("execution_supported"))
            rubric["execution"] = {
                "execution_supported": execution_supported,
                "execution_reason": metadata.get("execution_reason"),
                "language": metadata.get("language"),
                "function_name": metadata.get("function_name") or "solve",
                "starter_code": metadata.get("starter_code"),
                "test_cases": metadata.get("test_cases") if execution_supported else [],
            }
        return rubric


AssessmentPlanItem = QuestionBank | RagAssessmentItem


def normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def role_from_text(value: str | None) -> str | None:
    haystack = normalize_text(value)
    if not haystack:
        return None
    for role in ROLE_PRIORITY:
        if any(keyword in haystack for keyword in ROLE_KEYWORDS[role]):
            return role
    return None


def normalize_profile_role(profile: CandidateProfile) -> str:
    explicit_role = role_from_text(profile.target_role)
    if explicit_role:
        return explicit_role
    haystack = " ".join(
        [
            normalize_text(profile.experience_level),
            " ".join(profile.skills or []).lower(),
            " ".join(profile.tech_stack or []).lower(),
        ]
    )
    for role in ROLE_PRIORITY:
        if any(keyword in haystack for keyword in ROLE_KEYWORDS[role]):
            return role
    return "general"


def infer_difficulty(profile: CandidateProfile) -> str:
    experience = normalize_text(profile.experience_level)
    if any(token in experience for token in ["senior", "lead", "principal", "advanced"]):
        return "advanced"
    if any(token in experience for token in ["entry", "fresh", "fresher", "beginner"]):
        return "beginner"
    if any(token in experience for token in ["junior", "student", "early"]):
        return "intermediate"
    return "intermediate"


def difficulty_band(profile: CandidateProfile) -> str:
    experience = normalize_text(profile.experience_level)
    if any(token in experience for token in ["senior", "lead", "principal", "advanced"]):
        return "advanced"
    if any(token in experience for token in ["entry", "fresh", "fresher", "beginner"]):
        return "entry"
    return "intermediate"


def difficulty_plan_for(profile: CandidateProfile) -> list[str]:
    return DIFFICULTY_PLANS[difficulty_band(profile)]


def normalized_difficulty(value: str | None) -> str:
    lowered = normalize_text(value)
    if lowered in {"easy", "entry"}:
        return "beginner"
    if lowered == "medium":
        return "intermediate"
    if lowered == "hard":
        return "advanced"
    return lowered or "intermediate"


def difficulty_distance(actual: str | None, desired: str | None) -> int:
    actual_rank = DIFFICULTY_RANK.get(normalize_text(actual), DIFFICULTY_RANK.get(normalized_difficulty(actual), 1))
    desired_rank = DIFFICULTY_RANK.get(normalize_text(desired), DIFFICULTY_RANK.get(normalized_difficulty(desired), 1))
    return abs(actual_rank - desired_rank)


def profile_tags(profile: CandidateProfile) -> set[str]:
    return {tag.lower() for tag in [*(profile.skills or []), *(profile.tech_stack or [])]}


def previous_answered_assessment_item_ids(db: Session, profile: CandidateProfile) -> set[str]:
    recent_sessions = db.scalars(
        select(AssessmentSession)
        .where(AssessmentSession.candidate_id == profile.id)
        .order_by(desc(AssessmentSession.created_at))
    ).all()
    ids: set[str] = set()
    for session in recent_sessions:
        metadata = session.session_plan_metadata or {}
        rag_metadata = metadata.get("rag") if isinstance(metadata, dict) else None
        selected_document_ids = (
            [str(item) for item in rag_metadata.get("selected_document_ids", []) if item]
            if isinstance(rag_metadata, dict)
            else []
        )
        for answer in session.answers:
            question = answer.assessment_question
            if question is None:
                continue
            if question.question_bank_id != RAG_SENTINEL_QUESTION_ID:
                ids.add(question.question_bank_id)
            elif question.order_index < len(selected_document_ids):
                ids.add(selected_document_ids[question.order_index])
    return ids


def recent_assessment_item_ids(db: Session, profile: CandidateProfile, limit: int = 3) -> set[str]:
    return previous_answered_assessment_item_ids(db, profile)


def selection_hash(seed: str, item_id: str) -> int:
    digest = hashlib.sha256(f"{seed}:{item_id}".encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def question_bucket(question_type: str | None, category: str | None, title: str | None = None) -> str:
    signal = " ".join([normalize_text(question_type), normalize_text(category), normalize_text(title)])
    if "coding" in signal or "code" in signal or "algorithm" in signal:
        return "coding"
    if "debug" in signal or "scenario" in signal:
        return "debugging"
    if "communication" in signal or "tradeoff" in signal or "stakeholder" in signal:
        return "communication"
    if "system" in signal or "architecture" in signal or "design" in signal:
        return "system_design"
    return "role_conceptual"


def safe_selection_metadata(
    *,
    bucket: str,
    desired_difficulty: str,
    matched_role: str,
    matched_skills: list[str],
    reason: str,
    reused_question: bool = False,
) -> dict:
    return {
        "selected_from_pool": True,
        "selection_bucket": bucket,
        "desired_difficulty": desired_difficulty,
        "matched_role": matched_role,
        "matched_skills": matched_skills[:8],
        "selection_reason": reason,
        "reused_question": reused_question,
    }


def objective_config_from_rubric(rubric: dict | None) -> dict:
    if not isinstance(rubric, dict):
        return {}
    config = rubric.get("mcq") or rubric.get("objective")
    return config if isinstance(config, dict) else {}


def objective_config(question: AssessmentQuestion) -> dict:
    return objective_config_from_rubric(question.scoring_rubric)


def objective_options_from_config(config: dict) -> list[dict]:
    options = config.get("options")
    if not isinstance(options, list):
        return []
    normalized: list[dict] = []
    for index, option in enumerate(options):
        if isinstance(option, dict):
            option_id = str(option.get("id") or option.get("value") or chr(97 + index))
            text = str(option.get("text") or option.get("label") or "").strip()
            is_correct = bool(option.get("is_correct") or option.get("correct"))
        else:
            option_id = chr(97 + index)
            text = str(option).strip()
            is_correct = False
        if text:
            normalized.append({"id": option_id, "text": text, "is_correct": is_correct})
    correct_option_id = config.get("correct_option_id") or config.get("answer")
    if correct_option_id:
        for option in normalized:
            option["is_correct"] = option["id"] == str(correct_option_id)
    return normalized


def is_objective_rubric(rubric: dict | None) -> bool:
    return len(objective_options_from_config(objective_config_from_rubric(rubric))) >= 2


def objective_option_order(options: list[dict], session_id: str, question_key: str) -> list[str]:
    return [
        option["id"]
        for option in sorted(
            options,
            key=lambda option: selection_hash(f"{session_id}:mcq:{question_key}", option["id"]),
        )
    ]


def apply_objective_session_order(scoring_rubric: dict, session_id: str, question_key: str) -> dict:
    config = objective_config_from_rubric(scoring_rubric)
    options = objective_options_from_config(config)
    if len(options) < 2:
        return scoring_rubric
    target_key = "mcq" if "mcq" in scoring_rubric else "objective"
    config = dict(config)
    config["option_order"] = objective_option_order(options, session_id, question_key)
    scoring_rubric[target_key] = config
    return scoring_rubric


def public_objective_metadata(question: AssessmentQuestion) -> dict:
    config = objective_config(question)
    options = objective_options_from_config(config)
    if len(options) < 2:
        return {"objective_question": False, "objective_options": []}
    option_by_id = {option["id"]: option for option in options}
    order = [str(item) for item in config.get("option_order", []) if str(item) in option_by_id]
    if not order:
        order = [option["id"] for option in options]
    ordered = [option_by_id[option_id] for option_id in order]
    ordered.extend(option for option in options if option["id"] not in set(order))
    return {
        "objective_question": True,
        "objective_options": [{"id": option["id"], "text": option["text"]} for option in ordered],
    }


def objective_answer_result(question: AssessmentQuestion, selected_option_id: str | None) -> dict:
    config = objective_config(question)
    options = objective_options_from_config(config)
    option_by_id = {option["id"]: option for option in options}
    selected = option_by_id.get(selected_option_id or "")
    correct = next((option for option in options if option.get("is_correct")), None)
    is_correct = bool(selected and correct and selected["id"] == correct["id"])
    score = 100 if is_correct else 0
    return {
        "objective_question": True,
        "selected_option_id": selected_option_id,
        "selected_option_text": selected["text"] if selected else None,
        "is_correct": is_correct,
        "score": score,
        "max_score": 100,
        "difficulty": question.difficulty,
        "category": question.category,
    }


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
    score += max(0, 3 - difficulty_distance(question.difficulty, difficulty))
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
    avoid_ids: set[str] | None = None,
    selection_seed: str = "",
    required_bucket: str | None = None,
    allow_reused: bool = True,
) -> QuestionBank | None:
    avoid_ids = avoid_ids or set()
    candidates = [
        question
        for question in questions
        if question.id not in selected_ids and question.id != RAG_SENTINEL_QUESTION_ID
    ]
    if required_category:
        category_candidates = [question for question in candidates if question.category == required_category]
        if category_candidates:
            candidates = category_candidates
    if required_bucket:
        bucket_candidates = [
            question
            for question in candidates
            if question_bucket(question.question_type, question.category, question.question_text) == required_bucket
        ]
        if bucket_candidates:
            candidates = bucket_candidates
        else:
            logger.info(
                "[ASSESSMENT_SELECTION_FALLBACK] bucket=%s reason=no_curated_bucket_candidates",
                required_bucket,
            )
    if not candidates:
        return None
    fresh_candidates = [question for question in candidates if question.id not in avoid_ids]
    if not fresh_candidates and not allow_reused:
        return None
    candidates = fresh_candidates or candidates
    scored_candidates = [
        (question, question_score(question, role, difficulty, tags, required_category)[0])
        for question in candidates
    ]
    max_score = max(score for _, score in scored_candidates)
    top_candidates = [question for question, score in scored_candidates if score >= max_score - 3]
    return sorted(
        top_candidates,
        key=lambda question: selection_hash(selection_seed, question.id),
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


def build_curated_session_plan(
    db: Session,
    profile: CandidateProfile,
    *,
    session_seed: str | None = None,
) -> tuple[list[QuestionBank], dict]:
    role = normalize_profile_role(profile)
    difficulty = infer_difficulty(profile)
    tags = profile_tags(profile)
    previous_ids = previous_answered_assessment_item_ids(db, profile)
    selection_seed = session_seed or f"{profile.id}:{datetime.now(timezone.utc).date().isoformat()}:{len(previous_ids)}"
    questions = db.scalars(select(QuestionBank).where(QuestionBank.id != RAG_SENTINEL_QUESTION_ID)).all()

    if len(questions) < 6:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Question bank must contain at least 6 questions before starting assessment",
        )

    selected: list[QuestionBank] = []
    selected_ids: set[str] = set()
    selection_trace: list[dict] = []
    difficulty_plan = difficulty_plan_for(profile)
    bucket_category_fallback = {
        "role_conceptual": None,
        "system_design": "system_design",
        "debugging": "debugging",
        "coding": "technical_fundamentals",
        "communication": "communication",
    }
    for index, bucket in enumerate(ASSESSMENT_BUCKET_PLAN):
        desired_difficulty = difficulty_plan[min(index, len(difficulty_plan) - 1)]
        question = choose_best_question(
            questions,
            selected_ids,
            role,
            desired_difficulty,
            tags,
            bucket_category_fallback.get(bucket),
            avoid_ids=previous_ids,
            selection_seed=selection_seed,
            required_bucket=bucket,
            allow_reused=False,
        )
        if question is not None:
            if difficulty_distance(question.difficulty, desired_difficulty) > 0:
                logger.info(
                    "[ASSESSMENT_DIFFICULTY_FALLBACK] source=question_bank bucket=%s desired=%s selected=%s question_id=%s",
                    bucket,
                    desired_difficulty,
                    question.difficulty,
                    question.id,
                )
            selected.append(question)
            selected_ids.add(question.id)
            selection_trace.append(
                safe_selection_metadata(
                    bucket=bucket,
                    desired_difficulty=desired_difficulty,
                    matched_role=role,
                    matched_skills=sorted(tags.intersection({tag.lower() for tag in question.tech_stack or []})),
                    reason=f"Selected curated question for {bucket} bucket.",
                    reused_question=question.id in previous_ids,
                )
            )

    while len(selected) < 6:
        desired_difficulty = difficulty_plan[min(len(selected), len(difficulty_plan) - 1)]
        question = choose_best_question(
            questions,
            selected_ids,
            role,
            desired_difficulty,
            tags,
            None,
            avoid_ids=previous_ids,
            selection_seed=selection_seed,
            allow_reused=False,
        )
        if question is None:
            break
        if difficulty_distance(question.difficulty, desired_difficulty) > 0:
            logger.info(
                "[ASSESSMENT_DIFFICULTY_FALLBACK] source=question_bank bucket=best_available desired=%s selected=%s question_id=%s",
                desired_difficulty,
                question.difficulty,
                question.id,
            )
        selected.append(question)
        selected_ids.add(question.id)
        selection_trace.append(
            safe_selection_metadata(
                bucket="best_available",
                desired_difficulty=desired_difficulty,
                matched_role=role,
                matched_skills=sorted(tags.intersection({tag.lower() for tag in question.tech_stack or []})),
                reason="Filled remaining assessment slot from best available curated pool.",
                reused_question=question.id in previous_ids,
            )
        )

    while len(selected) < 6:
        desired_difficulty = difficulty_plan[min(len(selected), len(difficulty_plan) - 1)]
        question = choose_best_question(
            questions,
            selected_ids,
            role,
            desired_difficulty,
            tags,
            None,
            avoid_ids=previous_ids,
            selection_seed=selection_seed,
            allow_reused=True,
        )
        if question is None:
            break
        logger.info(
            "[ASSESSMENT_SELECTION_FALLBACK] source=question_bank reason=reusing_previous_question question_id=%s",
            question.id,
        )
        selected.append(question)
        selected_ids.add(question.id)
        selection_trace.append(
            safe_selection_metadata(
                bucket="reused_fallback",
                desired_difficulty=desired_difficulty,
                matched_role=role,
                matched_skills=sorted(tags.intersection({tag.lower() for tag in question.tech_stack or []})),
                reason="Reused prior question because the fresh question pool could not fill the assessment.",
                reused_question=True,
            )
        )

    metadata = {
        "normalized_role": role,
        "selected_difficulty": difficulty,
        "profile_target_role": profile.target_role,
        "profile_skills": profile.skills,
        "profile_tech_stack": profile.tech_stack,
        "category_plan": [question.category for question in selected],
        "question_type_plan": [question.question_type for question in selected],
        "bucket_plan": ASSESSMENT_BUCKET_PLAN,
        "difficulty_plan": difficulty_plan,
        "selection_trace": selection_trace[:6],
        "previous_question_ids_avoided": sorted(previous_ids),
        "recent_question_ids_avoided": sorted(previous_ids),
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
    return question_bucket(result.question_type, result.category, result.title)


def retrieval_result_from_document(document: RagDocument) -> RagRetrievalResult:
    return RagRetrievalResult(
        document_id=document.id,
        source_type=document.source_type,
        title=document.title,
        role=document.role,
        tech_stack=document.tech_stack or [],
        difficulty=document.difficulty,
        experience_level=document.experience_level,
        category=document.category,
        question_type=document.question_type,
        summary=document.content,
        score=RagScoreBreakdown(
            final_score=0,
            vector_score=0,
            tech_stack_score=0,
            role_score=0,
            difficulty_score=0,
            diversity_score=0,
        ),
        why_matched="Selected from local RAG pool to satisfy assessment bucket coverage.",
        fallback_used=True,
    )


def balanced_rag_selection(
    db: Session,
    results: list[RagRetrievalResult],
    target_role: str | None,
    *,
    difficulty_plan: list[str],
    avoid_document_ids: set[str] | None = None,
    selection_seed: str = "",
    allow_pool_fallback: bool = True,
) -> tuple[list[RagAssessmentItem], list[dict], list[dict]]:
    avoid_document_ids = avoid_document_ids or set()
    normalized_role = role_from_text(target_role) or "general"
    slots = ASSESSMENT_BUCKET_PLAN

    documents = {
        document.id: document
        for document in db.scalars(select(RagDocument).where(RagDocument.id.in_([item.document_id for item in results])))
    }
    active_pool_documents = db.scalars(
        select(RagDocument).where(
            RagDocument.is_active.is_(True),
            RagDocument.source_type.in_(["question", "coding_task"]),
        )
    ).all()
    selected: list[RagAssessmentItem] = []
    selected_ids: set[str] = set()
    slot_allocation: list[dict] = []
    selection_trace: list[dict] = []

    def slot_candidates(slot: str) -> list[RagRetrievalResult]:
        return [
            result
            for result in results
            if result.document_id not in selected_ids and slot_for_result(result) == slot
        ]

    def choose_result(
        candidates: list[RagRetrievalResult],
        desired_difficulty: str,
        *,
        allow_reused: bool = True,
    ) -> RagRetrievalResult | None:
        if not candidates:
            return None
        fresh = [result for result in candidates if result.document_id not in avoid_document_ids]
        if not fresh and not allow_reused:
            return None
        pool = fresh or candidates
        max_score = max(result.score.final_score for result in pool)
        top_pool = [result for result in pool if result.score.final_score >= max_score - 5]
        return sorted(
            top_pool,
            key=lambda result: (
                -difficulty_distance(result.difficulty, desired_difficulty),
                selection_hash(selection_seed, result.document_id),
            ),
            reverse=True,
        )[0]

    def choose_document(
        candidates: list[RagDocument],
        desired_difficulty: str,
        *,
        allow_reused: bool = True,
    ) -> RagDocument | None:
        if not candidates:
            return None
        fresh = [document for document in candidates if document.id not in avoid_document_ids]
        if not fresh and not allow_reused:
            return None
        pool = fresh or candidates
        min_distance = min(difficulty_distance(document.difficulty, desired_difficulty) for document in pool)
        top_pool = [
            document
            for document in pool
            if difficulty_distance(document.difficulty, desired_difficulty) <= min_distance + 1
        ]
        return sorted(
            top_pool,
            key=lambda document: (
                -difficulty_distance(document.difficulty, desired_difficulty),
                selection_hash(selection_seed, document.id),
            ),
            reverse=True,
        )[0]

    for index, slot in enumerate(slots):
        desired_difficulty = difficulty_plan[min(index, len(difficulty_plan) - 1)]
        candidates = slot_candidates(slot)
        match = choose_result(candidates, desired_difficulty, allow_reused=False)
        document = documents.get(match.document_id) if match is not None else None
        if match is None and allow_pool_fallback:
            fallback_document = choose_document(
                [
                    document
                    for document in active_pool_documents
                    if document.id not in selected_ids
                    and question_bucket(document.question_type, document.category, document.title) == slot
                ],
                desired_difficulty,
                allow_reused=False,
            )
            if fallback_document is not None:
                logger.info(
                    "[ASSESSMENT_SELECTION_FALLBACK] bucket=%s desired_difficulty=%s reason=selected_from_local_rag_pool document_id=%s",
                    slot,
                    desired_difficulty,
                    fallback_document.id,
                )
                document = fallback_document
                match = retrieval_result_from_document(fallback_document)
            else:
                logger.info(
                    "[ASSESSMENT_SELECTION_FALLBACK] bucket=%s desired_difficulty=%s reason=no_rag_bucket_candidates",
                    slot,
                    desired_difficulty,
                )
                continue
        elif match is None:
            logger.info(
                "[ASSESSMENT_SELECTION_FALLBACK] bucket=%s desired_difficulty=%s reason=no_rag_bucket_candidates",
                slot,
                desired_difficulty,
            )
            continue
        if document is None:
            continue
        if difficulty_distance(match.difficulty, desired_difficulty) > 0:
            logger.info(
                "[ASSESSMENT_DIFFICULTY_FALLBACK] source=rag bucket=%s desired=%s selected=%s document_id=%s",
                slot,
                desired_difficulty,
                match.difficulty,
                match.document_id,
            )
        selected.append(
            RagAssessmentItem(
                rag_document=document,
                result=match,
                time_limit_seconds=rag_time_limit_seconds(document),
            )
        )
        selected_ids.add(match.document_id)
        slot_allocation.append({"slot": slot, "rag_document_id": match.document_id})
        selection_trace.append(
            safe_selection_metadata(
                bucket=slot,
                desired_difficulty=desired_difficulty,
                matched_role=normalized_role,
                matched_skills=match.score.model_dump().get("matched_stack_terms", [])
                if hasattr(match.score, "model_dump")
                else [],
                reason=f"Selected RAG document for {slot} bucket.",
                reused_question=match.document_id in avoid_document_ids,
            )
        )

    for result in results:
        if len(selected) >= 6:
            break
        if result.document_id in selected_ids or result.document_id in avoid_document_ids:
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
        selection_trace.append(
            safe_selection_metadata(
                bucket="best_available",
                desired_difficulty=difficulty_plan[min(len(selected) - 1, len(difficulty_plan) - 1)],
                matched_role=normalized_role,
                matched_skills=[],
                reason="Filled remaining assessment slot from best available RAG pool.",
                reused_question=False,
            )
        )

    for result in results:
        if len(selected) >= 6:
            break
        if result.document_id in selected_ids or result.document_id not in avoid_document_ids:
            continue
        document = documents.get(result.document_id)
        if document is None:
            continue
        logger.info(
            "[ASSESSMENT_SELECTION_FALLBACK] source=rag reason=reusing_previous_question document_id=%s",
            result.document_id,
        )
        selected.append(
            RagAssessmentItem(
                rag_document=document,
                result=result,
                time_limit_seconds=rag_time_limit_seconds(document),
            )
        )
        selected_ids.add(result.document_id)
        slot_allocation.append({"slot": "reused_fallback", "rag_document_id": result.document_id})
        selection_trace.append(
            safe_selection_metadata(
                bucket="reused_fallback",
                desired_difficulty=difficulty_plan[min(len(selected) - 1, len(difficulty_plan) - 1)],
                matched_role=normalized_role,
                matched_skills=[],
                reason="Reused prior RAG question because the fresh pool could not fill the assessment.",
                reused_question=True,
            )
        )

    return selected[:6], slot_allocation, selection_trace[:6]


def build_rag_session_plan(
    db: Session,
    profile: CandidateProfile,
    *,
    session_seed: str | None = None,
) -> tuple[list[RagAssessmentItem], dict]:
    settings = get_settings()
    difficulty = infer_difficulty(profile) or settings.rag_default_difficulty
    difficulty_plan = difficulty_plan_for(profile)
    previous_ids = previous_answered_assessment_item_ids(db, profile)
    selection_seed = session_seed or f"{profile.id}:{datetime.now(timezone.utc).isoformat()}"
    configured_threshold = configured_min_similarity(settings.rag_min_similarity)
    thresholds = list(dict.fromkeys([configured_threshold, min(configured_threshold, 20), 0]))
    response = None
    selected: list[RagAssessmentItem] = []
    slot_allocation: list[dict] = []
    selection_trace: list[dict] = []
    threshold_used = configured_threshold
    for threshold in thresholds:
        response = retrieve_for_assessment(
            db,
            target_role=profile.target_role,
            tech_stack=profile.tech_stack or [],
            skills=profile.skills or [],
            experience_level=profile.experience_level,
            difficulty=difficulty,
            limit=max(24, settings.rag_top_k * 3),
            min_similarity=threshold,
        )
        selected, slot_allocation, selection_trace = balanced_rag_selection(
            db,
            response.results,
            profile.target_role,
            difficulty_plan=difficulty_plan,
            avoid_document_ids=previous_ids,
            selection_seed=selection_seed,
            allow_pool_fallback=threshold == thresholds[-1],
        )
        threshold_used = threshold
        has_coding = any(item.question_type == "coding" for item in selected)
        if len(selected) >= 6 and has_coding:
            break
        if len(selected) >= 4 and threshold == 0:
            break
    if response is None:
        raise RuntimeError("RAG retrieval did not run")
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
        "question_type_plan": [item.question_type for item in selected],
        "bucket_plan": ASSESSMENT_BUCKET_PLAN,
        "difficulty_plan": difficulty_plan,
        "selection_trace": selection_trace,
        "previous_question_ids_avoided": sorted(previous_ids),
        "recent_question_ids_avoided": sorted(previous_ids),
        "rag": {
            "query_text": response.query_text,
            "fallback_used": response.fallback_used,
            "configured_min_similarity": configured_threshold,
            "min_similarity_used": threshold_used,
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


def build_session_plan(
    db: Session,
    profile: CandidateProfile,
    *,
    session_seed: str | None = None,
) -> tuple[list[AssessmentPlanItem], dict]:
    settings = get_settings()
    if not settings.enable_rag_assessment:
        selected, metadata = build_curated_session_plan(db, profile, session_seed=session_seed)
        metadata["question_source"] = "question_bank"
        return selected, metadata

    try:
        return build_rag_session_plan(db, profile, session_seed=session_seed)
    except Exception as exc:
        if not settings.enable_rag_curated_fallback:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"RAG assessment unavailable: {exc}",
            ) from exc
        selected, metadata = build_curated_session_plan(db, profile, session_seed=session_seed)
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
        selected_option_id=(answer.answer_metadata or {}).get("selected_option_id"),
    )


def question_read(question: AssessmentQuestion) -> AssessmentQuestionRead:
    return AssessmentQuestionRead(
        id=question.id,
        question_bank_id=question.question_bank_id,
        order_index=question.order_index,
        question_text=question.question_text,
        question_type=question.question_type,
        category=question.category,
        difficulty=question.difficulty,
        time_limit_seconds=question.time_limit_seconds,
        expected_concepts=question.expected_concepts,
        scoring_rubric=sanitized_scoring_rubric(question),
        **public_execution_metadata(question),
        **public_objective_metadata(question),
    )


def session_detail(session: AssessmentSession) -> AssessmentSessionDetail:
    return AssessmentSessionDetail(
        session=AssessmentSessionRead.model_validate(session),
        questions=[question_read(question) for question in session.questions],
        answers=[answer_read(answer) for answer in session.answers],
        current_question=(
            question_read(current_question(session))
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

    session_id = str(uuid4())
    selected_questions, metadata = build_session_plan(db, profile, session_seed=session_id)
    now = datetime.now(timezone.utc)
    session = AssessmentSession(
        id=session_id,
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
        scoring_rubric = dict(question.scoring_rubric or {})
        question_key = question.id if isinstance(question, QuestionBank) else question.rag_document.id
        scoring_rubric["frozen_session_source"] = {
            "source_question_id": question.id if isinstance(question, QuestionBank) else None,
            "source_rag_document_id": None if isinstance(question, QuestionBank) else question.rag_document.id,
            "selected_from_pool": True,
        }
        scoring_rubric = apply_objective_session_order(
            scoring_rubric,
            session.id,
            question_key or question_bank_id or str(index),
        )
        selection_trace = metadata.get("selection_trace") if isinstance(metadata, dict) else None
        if isinstance(selection_trace, list) and index < len(selection_trace):
            scoring_rubric["selection_metadata"] = selection_trace[index]
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
                scoring_rubric=scoring_rubric,
            )
        )
    logger.info(
        "[ASSESSMENT_SESSION_FROZEN] session_id=%s frozen_question_source_ids=%s",
        session.id,
        [
            question.id if isinstance(question, QuestionBank) else question.rag_document.id
            for question in selected_questions
        ],
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

    session_question_ids = {question.id for question in session.questions}
    if payload.assessment_question_id not in session_question_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer question_id does not belong to this assessment session",
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
    selected_option_id = payload.selected_option_id.strip() if payload.selected_option_id else None
    objective_public = public_objective_metadata(question)
    if selected_option_id and not objective_public["objective_question"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="selected_option_id is only valid for objective questions",
        )
    if objective_public["objective_question"]:
        option_ids = {option["id"] for option in objective_public["objective_options"]}
        if not selected_option_id and not answer_text and not code_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Select an option before submitting this question",
            )
        if selected_option_id and selected_option_id not in option_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Selected option is not valid for this question",
            )
        selected_option = (
            next(option for option in objective_public["objective_options"] if option["id"] == selected_option_id)
            if selected_option_id
            else None
        )
        if selected_option is not None and not answer_text:
            answer_text = selected_option["text"]
    if not answer_text and not code_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Submit answer_text, code_text, or both",
        )
    answer_metadata = dict(payload.metadata or {})
    if selected_option_id:
        answer_metadata["selected_option_id"] = selected_option_id
    ai_evaluation = {}
    if objective_public["objective_question"] and selected_option_id:
        result = objective_answer_result(question, selected_option_id)
        answer_metadata["objective"] = {
            "selected_option_id": result["selected_option_id"],
            "selected_option_text": result["selected_option_text"],
        }
        ai_evaluation["objective_result"] = result

    answer = AssessmentAnswer(
        session_id=session.id,
        assessment_question_id=question.id,
        question_bank_id=question.question_bank_id,
        order_index=question.order_index,
        answer_text=answer_text,
        code_text=code_text,
        duration_seconds=payload.duration_seconds,
        answer_metadata=answer_metadata,
        ai_evaluation=ai_evaluation,
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
            question_read(next_question) if next_question is not None else None
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
            question_read(question) if question is not None else None
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
