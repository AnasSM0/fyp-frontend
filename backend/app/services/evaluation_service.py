from types import SimpleNamespace
import json
import logging
import re
import threading
import uuid

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.models.rag import RagDocument
from app.models.user import User
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AIBatchEvaluationDraft,
    AICompactQuestionEvaluation,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
    CoachReportRequest,
    CoachReportResponse,
    AIRubricContext,
    AIRubricContextItem,
    EvaluationReportDetail,
)
from app.services.assessment_service import session_for_user
from app.services.ai_provider import (
    FallbackAIProvider,
    ProviderOutputError,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
)
from app.services.ai_call_audit import current_report_audit, log_report_ai_summary, report_ai_audit
from app.services.ai_provider_factory import build_ai_provider
from app.services.integrity_service import integrity_penalty_for_score, integrity_summary_for_session
from app.services.scoring_service import (
    aggregate_answer_scores,
    calculate_verified_score,
    capped_project_quality,
    normalize_gpa,
)
from app.services.rag_retrieval_service import retrieve_rubrics
from app.services.redis_service import acquire_lock, release_lock

logger = logging.getLogger(__name__)

WEAK_ANSWER_TEXTS = {
    "",
    "idk",
    "i don't know",
    "i dont know",
    "don't know",
    "dont know",
    "not sure",
    "skip",
    "skipped",
    "n/a",
    "na",
}

TOKEN_RE = re.compile(r"[a-zA-Z0-9+#.]+")

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "why",
    "with",
    "would",
}

TECHNICAL_DETAIL_TERMS = {
    "api",
    "cache",
    "component",
    "constraint",
    "database",
    "endpoint",
    "error",
    "index",
    "latency",
    "migration",
    "query",
    "schema",
    "state",
    "token",
    "transaction",
    "type",
    "validation",
}

GENERIC_PHRASES = [
    "clarify requirements",
    "handle edge cases",
    "make it scalable",
    "best practices",
    "write clean code",
    "test thoroughly",
    "it depends",
    "user friendly",
    "optimize performance",
    "proper error handling",
]

EXAMPLE_MARKERS = ["for example", "for instance", "e.g.", "such as", "like when", "in my project"]
TRADEOFF_MARKERS = ["tradeoff", "trade-off", "pros and cons", "alternative", "downside", "cost", "latency", "complexity", "compromise"]

GENERIC_RUBRIC_LIBRARY = {
    "code": {
        "rubric_id": "generic-code-quality",
        "rubric_title": "Generic Code Quality Rubric",
        "category": "code_quality",
        "expected_concepts": ["correctness", "readability", "edge cases", "maintainability"],
        "scoring_bullets": [
            "Correct implementation for the stated requirements.",
            "Readable structure with clear names and small units.",
            "Handles edge cases and invalid inputs.",
            "Reasonable complexity and maintainability.",
        ],
    },
    "debugging": {
        "rubric_id": "generic-debugging",
        "rubric_title": "Generic Debugging Rubric",
        "category": "debugging",
        "expected_concepts": ["root cause", "evidence", "fix", "verification"],
        "scoring_bullets": [
            "Identifies a plausible root cause from available evidence.",
            "Explains how to verify the issue before changing code.",
            "Proposes a focused fix and regression check.",
            "Avoids vague or unsupported diagnosis.",
        ],
    },
    "system_design": {
        "rubric_id": "generic-system-design",
        "rubric_title": "Generic System Design Rubric",
        "category": "system_design",
        "expected_concepts": ["requirements", "components", "data flow", "tradeoffs"],
        "scoring_bullets": [
            "Clarifies requirements and constraints.",
            "Breaks the system into clear components and data flow.",
            "Covers reliability, scaling, and tradeoffs where relevant.",
            "Communicates assumptions and limitations clearly.",
        ],
    },
    "communication": {
        "rubric_id": "generic-communication",
        "rubric_title": "Generic Communication Rubric",
        "category": "communication",
        "expected_concepts": ["clarity", "structure", "tradeoffs", "evidence"],
        "scoring_bullets": [
            "Uses clear, structured technical explanation.",
            "Connects decisions to evidence from the prompt.",
            "Explains tradeoffs and alternatives.",
            "Avoids unsupported claims or vague wording.",
        ],
    },
    "api_database": {
        "rubric_id": "generic-api-database",
        "rubric_title": "Generic API and Database Rubric",
        "category": "api_database",
        "expected_concepts": ["validation", "data model", "errors", "query performance"],
        "scoring_bullets": [
            "Defines request/response contracts and validation.",
            "Models data with appropriate constraints and relationships.",
            "Handles errors and status codes explicitly.",
            "Considers indexes, transactions, and query performance.",
        ],
    },
    "technical_reasoning": {
        "rubric_id": "generic-technical-reasoning",
        "rubric_title": "Generic Technical Reasoning Rubric",
        "category": "technical_reasoning",
        "expected_concepts": ["correctness", "expected concepts", "role relevance", "clarity"],
        "scoring_bullets": [
            "Answers the question directly and correctly.",
            "Covers the expected concepts with concrete detail.",
            "Connects the answer to the candidate role and stack.",
            "Explains reasoning clearly without overclaiming.",
        ],
    },
}

_REPORT_LOCKS: dict[str, threading.Lock] = {}
_REPORT_LOCKS_GUARD = threading.Lock()


def report_generation_lock(session_id: str) -> threading.Lock:
    with _REPORT_LOCKS_GUARD:
        if session_id not in _REPORT_LOCKS:
            _REPORT_LOCKS[session_id] = threading.Lock()
        return _REPORT_LOCKS[session_id]


def report_generation_lock_key(session_id: str) -> str:
    return f"report_generation_lock:{session_id}"


def generation_in_progress_detail(
    session_id: str,
    *,
    redis_enabled: bool,
    fallback_to_memory_lock: bool,
    lock_ttl_seconds: int,
) -> dict:
    return {
        "code": "generation_in_progress",
        "status": "generation_in_progress",
        "detail": "Report generation already in progress.",
        "reason": "generation_already_in_progress",
        "message": "Report generation is already in progress for this session.",
        "session_id": session_id,
        "retryable": True,
        "redis_enabled": redis_enabled,
        "generation_in_flight": True,
        "report_lock_acquired": False,
        "lock_ttl_seconds": lock_ttl_seconds,
        "fallback_to_memory_lock": fallback_to_memory_lock,
    }


def _provider_unavailable_detail(provider_metadata, *, rate_limited: bool, settings) -> dict:
    metadata = provider_metadata.model_dump()
    audit = current_report_audit()
    audit_summary = current_ai_call_summary(status_label="failed")
    failed_providers = [
        provider
        for provider, reason in metadata.get("failure_reason", {}).items()
        if provider != "stub" and reason
    ]
    provider = failed_providers[-1] if failed_providers else metadata.get("actual_provider")
    failed_model = next(
        (
            attempt.get("model")
            for attempt in reversed(metadata.get("model_attempts", []))
            if attempt.get("provider") == provider and attempt.get("model")
        ),
        metadata.get("model"),
    )
    reason = (
        metadata.get("failure_reason", {}).get(provider)
        if isinstance(metadata.get("failure_reason"), dict)
        else None
    ) or ("rate_limited" if rate_limited else "provider_unavailable")
    retry_after_by_provider = metadata.get("retry_after_seconds", {})
    retry_after_seconds = (
        retry_after_by_provider.get(provider)
        if isinstance(retry_after_by_provider, dict)
        else None
    )
    return {
        "code": "ai_provider_unavailable",
        "status_code": status.HTTP_429_TOO_MANY_REQUESTS if rate_limited else status.HTTP_503_SERVICE_UNAVAILABLE,
        "detail": "AI provider rate limit reached." if rate_limited else "AI provider unavailable.",
        "message": (
            "AI provider rate limit reached."
            if rate_limited
            else "Real AI evaluation provider is unavailable. No verified report was created."
        ),
        "reason": reason,
        "provider": provider,
        "selected_provider": provider,
        "backend_default_provider": getattr(settings, "default_ai_provider", None),
        "model": failed_model,
        "retryable": True,
        "retry_after_seconds": (
            retry_after_seconds
            if retry_after_seconds is not None
            else getattr(settings, "ai_provider_failure_cooldown_seconds", 300)
            if rate_limited
            else None
        ),
        "total_ai_calls": audit.total_ai_calls if audit else None,
        "deepseek_calls": audit_summary.get("deepseek_calls"),
        "gemini_calls": audit_summary.get("gemini_calls"),
        "openrouter_calls": audit_summary.get("openrouter_calls"),
        "nvidia_calls": audit_summary.get("nvidia_calls"),
        "embedding_calls": audit_summary.get("embedding_calls"),
        "prompt_chars": audit_summary.get("prompt_chars"),
        "report_generation_id": audit_summary.get("report_generation_id"),
        "fallback_skipped": bool(metadata.get("fallback_skipped")),
        "fallback_skipped_reason": metadata.get("fallback_skipped_reason"),
        "redis_enabled": bool(getattr(settings, "redis_enabled", False) and getattr(settings, "redis_url", "")),
        "provider_cooldown_active": bool(metadata.get("provider_cooldown_active")),
        "cooldown_key": metadata.get("cooldown_key"),
        "provider_metadata": metadata,
    }


def _max_ai_calls_exceeded_detail(settings) -> dict:
    audit = current_report_audit()
    return {
        "code": "max_ai_calls_exceeded",
        "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "detail": "Evaluation exceeded the configured AI call budget.",
        "message": "Report generation stopped because it exceeded the free-tier AI call budget.",
        "reason": "max_ai_calls_exceeded",
        "retryable": False,
        "total_ai_calls": audit.total_ai_calls if audit else None,
        "max_ai_calls": getattr(settings, "evaluation_max_ai_calls_per_report", 1),
    }


def current_ai_call_summary(*, status_label: str) -> dict:
    audit = current_report_audit()
    if audit is None:
        return {
            "total_ai_calls": 0,
            "deepseek_calls": 0,
            "gemini_calls": 0,
            "openrouter_calls": 0,
            "nvidia_calls": 0,
            "embedding_calls": 0,
            "prompt_chars": 0,
            "status": status_label,
            "report_generation_id": None,
        }
    return {
        "total_ai_calls": audit.total_ai_calls,
        "deepseek_calls": audit.count_provider("deepseek"),
        "gemini_calls": audit.count_provider("gemini"),
        "openrouter_calls": audit.count_provider("openrouter"),
        "nvidia_calls": audit.count_provider("nvidia"),
        "embedding_calls": audit.count_purpose("embedding"),
        "prompt_chars": audit.prompt_chars,
        "status": status_label,
        "reason": audit.reason,
        "report_generation_id": audit.report_generation_id,
    }


def report_detail(report: EvaluationReport) -> EvaluationReportDetail:
    return EvaluationReportDetail.model_validate(report)


def get_report_for_user(db: Session, report_id: str, user: User) -> EvaluationReport:
    report = db.scalar(
        select(EvaluationReport)
        .join(CandidateProfile, EvaluationReport.candidate_id == CandidateProfile.id)
        .where(EvaluationReport.id == report_id, CandidateProfile.user_id == user.id)
    )
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation report not found")
    return report


def get_report_by_session_for_user(db: Session, session_id: str, user: User) -> EvaluationReport:
    session = session_for_user(db, session_id, user)
    report = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation report not found")
    return report


def latest_report_for_user(db: Session, user: User) -> EvaluationReport | None:
    return db.scalar(
        select(EvaluationReport)
        .join(CandidateProfile, EvaluationReport.candidate_id == CandidateProfile.id)
        .where(CandidateProfile.user_id == user.id)
        .order_by(desc(EvaluationReport.created_at))
    )


def ensure_session_ready(session: AssessmentSession) -> None:
    if session.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session must be completed before generating a report",
        )
    if not session.answers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session has no answers to evaluate",
        )


def answer_status_for(answer) -> str:
    if getattr(answer, "id", None) is None:
        return "skipped"
    answer_text = (getattr(answer, "answer_text", None) or "").strip().lower()
    code_text = (getattr(answer, "code_text", None) or "").strip()
    if not code_text and answer_text in WEAK_ANSWER_TEXTS:
        return "insufficient_response"
    return "answered"


def objective_result_for(answer) -> dict | None:
    result = (getattr(answer, "ai_evaluation", None) or {}).get("objective_result")
    return result if isinstance(result, dict) and result.get("objective_question") else None


def objective_answer_evaluation(answer, result: dict) -> AIAnswerEvaluation:
    question = answer.assessment_question
    score = max(0, min(100, int(result.get("score") or 0)))
    is_correct = bool(result.get("is_correct"))
    selected_text = result.get("selected_option_text") or "No option selected."
    expected = list(question.expected_concepts or [])
    return AIAnswerEvaluation(
        technical_accuracy=score,
        problem_solving=score,
        communication_clarity=score,
        reasoning_depth=score,
        code_quality=score,
        expected_concepts_covered=expected if is_correct else [],
        missing_concepts=[] if is_correct else expected,
        confidence=100,
        short_feedback="Objective check passed." if is_correct else "Objective check was incorrect.",
        transcript_evidence=[f"Selected option: {selected_text}", f"Objective score: {score}/100"],
    )


def answer_tokens(value: str | None) -> list[str]:
    return [token.lower() for token in TOKEN_RE.findall(value or "")]


def meaningful_tokens(*values) -> set[str]:
    return {token for token in answer_tokens(" ".join(str(value or "") for value in values)) if token not in STOP_WORDS and len(token) > 2}


def has_technical_detail(answer, tokens: set[str]) -> bool:
    question = answer.assessment_question
    expected_tokens = meaningful_tokens(*(question.expected_concepts or []))
    return bool(tokens.intersection(TECHNICAL_DETAIL_TERMS) or tokens.intersection(expected_tokens) or (answer.code_text or "").strip())


def answer_requires_example(answer) -> bool:
    question = answer.assessment_question
    metadata = getattr(answer, "answer_metadata", None) or {}
    expected_sections = [str(item).lower() for item in metadata.get("expected_sections", []) if item]
    signal = " ".join(
        [
            question.question_text or "",
            " ".join(question.expected_concepts or []),
            " ".join(expected_sections),
        ]
    ).lower()
    return "example" in signal or "concrete" in signal


def answer_requires_tradeoffs(answer) -> bool:
    question = answer.assessment_question
    signal = f"{question.question_type} {question.category} {question.question_text}".lower()
    return any(token in signal for token in ["system", "design", "architecture", "tradeoff", "trade-off"])


def answer_directly_addresses_question(answer, tokens: set[str]) -> bool:
    question = answer.assessment_question
    question_tokens = meaningful_tokens(question.question_text, *(question.expected_concepts or []))
    if not question_tokens:
        return True
    return len(tokens.intersection(question_tokens)) >= 2


def append_cap(applied: list[dict], cap: int, reason: str) -> None:
    applied.append({"cap": cap, "reason": reason})


def deterministic_answer_score_caps(answer, evaluation: AIAnswerEvaluation, compact: AICompactQuestionEvaluation | None = None) -> dict:
    answer_text = (getattr(answer, "answer_text", None) or "").strip()
    code_text = (getattr(answer, "code_text", None) or "").strip()
    normalized_answer = answer_text.lower()
    tokens = set(answer_tokens(answer_text))
    word_count = len(answer_tokens(answer_text))
    applied: list[dict] = []
    flags: list[str] = list(compact.generic_answer_flags if compact is not None else [])
    evidence_found: list[str] = list(compact.evidence_found if compact is not None else [])

    if not evidence_found and answer_text:
        evidence_found.append(trim_text(answer_text, 160) or "")

    if not code_text and normalized_answer in WEAK_ANSWER_TEXTS:
        append_cap(applied, 25, "blank_idk_or_skipped")
        flags.append("blank_or_idk")
    elif word_count <= 8 and not has_technical_detail(answer, tokens):
        append_cap(applied, 45, "very_short_without_technical_detail")
        flags.append("too_short")

    generic_hits = [phrase for phrase in GENERIC_PHRASES if phrase in normalized_answer]
    if generic_hits and word_count < 90:
        append_cap(applied, 65, "generic_answer_with_limited_specific_evidence")
        flags.append("generic")

    if answer_requires_example(answer) and not any(marker in normalized_answer for marker in EXAMPLE_MARKERS):
        append_cap(applied, 75, "missing_required_concrete_example")
        flags.append("missing_example")

    if answer_requires_tradeoffs(answer) and not any(marker in normalized_answer for marker in TRADEOFF_MARKERS):
        append_cap(applied, 80, "missing_tradeoffs_for_design_question")
        flags.append("missing_tradeoffs")

    if answer_text and not answer_directly_addresses_question(answer, tokens) and not code_text:
        append_cap(applied, 60, "answer_does_not_directly_address_question")
        flags.append("off_topic")

    if compact is not None and compact.suggested_score_cap is not None:
        append_cap(applied, int(compact.suggested_score_cap), "model_suggested_score_cap")

    cap_value = min([item["cap"] for item in applied], default=None)
    feedback_summary = (
        compact.feedback_summary
        if compact is not None and compact.feedback_summary
        else evaluation.short_feedback
    )
    return {
        "cap": cap_value,
        "applied_score_caps": applied,
        "generic_answer_flags": list(dict.fromkeys(flags)),
        "evidence_found": [item for item in dict.fromkeys(evidence_found) if item],
        "feedback_summary": feedback_summary,
    }


def apply_deterministic_score_caps(
    answer,
    evaluation: AIAnswerEvaluation,
    compact: AICompactQuestionEvaluation | None = None,
) -> tuple[AIAnswerEvaluation, dict]:
    cap_metadata = deterministic_answer_score_caps(answer, evaluation, compact)
    cap = cap_metadata["cap"]
    if cap is None:
        return evaluation, cap_metadata
    capped = evaluation.model_copy(
        update={
            "technical_accuracy": min(evaluation.technical_accuracy, cap),
            "problem_solving": min(evaluation.problem_solving, cap),
            "communication_clarity": min(evaluation.communication_clarity, cap),
            "reasoning_depth": min(evaluation.reasoning_depth, cap),
            "code_quality": min(evaluation.code_quality, cap),
        }
    )
    return capped, cap_metadata


def insufficient_answer_evaluation(answer, status_label: str) -> AIAnswerEvaluation:
    question = answer.assessment_question
    expected = list(question.expected_concepts or [])
    score = 0 if status_label == "skipped" else 12
    return AIAnswerEvaluation(
        technical_accuracy=score,
        problem_solving=score,
        communication_clarity=score,
        reasoning_depth=score,
        code_quality=score,
        expected_concepts_covered=[],
        missing_concepts=expected,
        confidence=95,
        short_feedback="Insufficient answer provided.",
        transcript_evidence=[
            "No substantive answer was provided." if status_label == "skipped" else f"Candidate response: {(answer.answer_text or '').strip()}"
        ],
    )


def synthetic_skipped_answer(session: AssessmentSession, question):
    return SimpleNamespace(
        id=None,
        session_id=session.id,
        assessment_question_id=question.id,
        question_bank_id=question.question_bank_id,
        order_index=question.order_index,
        answer_text=None,
        code_text=None,
        duration_seconds=0,
        answer_metadata={"answer_status": "skipped"},
        ai_evaluation={},
        assessment_question=question,
    )


def session_question_answers(session: AssessmentSession) -> list:
    answers_by_question_id = {answer.assessment_question_id: answer for answer in session.answers}
    return [
        answers_by_question_id.get(question.id) or synthetic_skipped_answer(session, question)
        for question in sorted(session.questions, key=lambda item: item.order_index)
    ]


def frozen_session_questions(session: AssessmentSession) -> list:
    return sorted(session.questions, key=lambda item: item.order_index)


def validate_report_source_of_truth(session: AssessmentSession, answers) -> list[str]:
    frozen_questions = frozen_session_questions(session)
    frozen_question_ids = [question.id for question in frozen_questions]
    frozen_question_id_set = set(frozen_question_ids)
    submitted_answer_question_ids = [
        answer.assessment_question_id
        for answer in answers
        if getattr(answer, "id", None) is not None
    ]
    duplicate_question_ids = [
        question_id
        for question_id in frozen_question_ids
        if frozen_question_ids.count(question_id) > 1
    ]
    foreign_answer_question_ids = [
        question_id
        for question_id in submitted_answer_question_ids
        if question_id not in frozen_question_id_set
    ]
    logger.info(
        "[REPORT_SOURCE_OF_TRUTH] session_id=%s frozen_question_ids=%s submitted_answer_question_ids=%s",
        session.id,
        frozen_question_ids,
        submitted_answer_question_ids,
    )
    if not frozen_question_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assessment session has no frozen questions to evaluate.",
        )
    if duplicate_question_ids or foreign_answer_question_ids:
        logger.error(
            "[REPORT_SOURCE_MISMATCH] session_id=%s duplicate_question_ids=%s foreign_answer_question_ids=%s",
            session.id,
            sorted(set(duplicate_question_ids)),
            foreign_answer_question_ids,
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "report_question_mapping_mismatch",
                "message": "Report generation stopped because answers do not match frozen session questions.",
                "session_id": session.id,
                "duplicate_question_ids": sorted(set(duplicate_question_ids)),
                "foreign_answer_question_ids": foreign_answer_question_ids,
            },
        )
    return frozen_question_ids


def validate_batch_ai_question_ids(
    session: AssessmentSession,
    frozen_question_ids: list[str],
    draft: AIBatchEvaluationDraft,
) -> list[str]:
    returned_question_ids = [item.question_id for item in draft.question_evaluations]
    frozen_question_id_set = set(frozen_question_ids)
    returned_question_id_set = set(returned_question_ids)
    unknown_question_ids = [
        question_id
        for question_id in returned_question_ids
        if question_id not in frozen_question_id_set
    ]
    duplicate_returned_ids = [
        question_id
        for question_id in returned_question_ids
        if returned_question_ids.count(question_id) > 1
    ]
    missing_question_ids = [
        question_id
        for question_id in frozen_question_ids
        if question_id not in returned_question_id_set
    ]
    logger.info(
        "[REPORT_AI_QUESTION_IDS] session_id=%s frozen_question_ids=%s ai_returned_question_ids=%s missing_question_ids=%s unknown_question_ids=%s",
        session.id,
        frozen_question_ids,
        returned_question_ids,
        missing_question_ids,
        unknown_question_ids,
    )
    if unknown_question_ids or duplicate_returned_ids:
        logger.error(
            "[REPORT_AI_QUESTION_MISMATCH] session_id=%s unknown_question_ids=%s duplicate_returned_ids=%s",
            session.id,
            unknown_question_ids,
            sorted(set(duplicate_returned_ids)),
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ai_question_id_mismatch",
                "message": "AI returned question IDs that do not match the frozen assessment session.",
                "session_id": session.id,
                "frozen_question_ids": frozen_question_ids,
                "ai_returned_question_ids": returned_question_ids,
                "unknown_question_ids": unknown_question_ids,
                "duplicate_returned_ids": sorted(set(duplicate_returned_ids)),
            },
        )
    return missing_question_ids


def question_wise_scores(
    answers,
    evaluations: list[AIAnswerEvaluation],
) -> list[dict]:
    return [
        {
            "answer_id": answer.id,
            "assessment_question_id": answer.assessment_question_id,
            "question_id": answer.assessment_question_id,
            "question_bank_id": answer.question_bank_id,
            "order_index": answer.order_index,
            "display_order": answer.order_index + 1,
            "question_text": answer.assessment_question.question_text,
            "candidate_answer": answer.answer_text,
            "code_text": answer.code_text,
            "category": answer.assessment_question.category,
            "difficulty": answer.assessment_question.difficulty,
            "question_type": answer.assessment_question.question_type,
            "score": int(
                round(
                    (
                        evaluation.technical_accuracy
                        + evaluation.problem_solving
                        + evaluation.communication_clarity
                        + evaluation.reasoning_depth
                        + evaluation.code_quality
                    )
                    / 5
                )
            ),
            "answer_status": answer.ai_evaluation.get("answer_status", answer_status_for(answer)),
            "strengths": evaluation.expected_concepts_covered,
            "weaknesses": evaluation.missing_concepts,
            "improvement_advice": evaluation.short_feedback,
            "evaluation": evaluation.model_dump(),
            "objective_result": objective_result_for(answer),
            "missing_concepts": answer.ai_evaluation.get("missing_concepts", evaluation.missing_concepts),
            "evidence_found": answer.ai_evaluation.get("evidence_found", []),
            "generic_answer_flags": answer.ai_evaluation.get("generic_answer_flags", []),
            "applied_score_caps": answer.ai_evaluation.get("applied_score_caps", []),
            "feedback_summary": answer.ai_evaluation.get("feedback_summary", evaluation.short_feedback),
            "rubric_document_ids": answer.ai_evaluation.get("rubric_document_ids", []),
            "rubric_titles": answer.ai_evaluation.get("rubric_titles", []),
        }
        for answer, evaluation in zip(answers, evaluations)
    ]


def build_rubric_query(profile: CandidateProfile, answer) -> str:
    question = answer.assessment_question
    answer_text = (answer.answer_text or "").strip()
    code_text = (answer.code_text or "").strip()
    answer_summary = answer_text[:600]
    code_indicator = "Code answer present." if code_text else "No code answer."
    return "\n".join(
        [
            f"Target role: {profile.target_role or 'unspecified'}",
            f"Tech stack: {', '.join(profile.tech_stack or [])}",
            f"Skills: {', '.join(profile.skills or [])}",
            f"Question category: {question.category}",
            f"Question type: {question.question_type}",
            f"Difficulty: {question.difficulty}",
            f"Question: {question.question_text}",
            f"Expected concepts: {', '.join(question.expected_concepts or [])}",
            f"Candidate answer summary: {answer_summary}",
            code_indicator,
        ]
    )


def local_tokens(*values) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        if isinstance(value, list):
            tokens.update(local_tokens(*value))
        elif value:
            tokens.update(token.lower() for token in TOKEN_RE.findall(str(value)))
            normalized = str(value).strip().lower()
            if normalized:
                tokens.add(normalized)
    return tokens


def scoring_bullets_from_rubric(scoring_rubric: dict | None, expected_concepts: list[str]) -> list[str]:
    bullets: list[str] = []
    if isinstance(scoring_rubric, dict):
        for key, value in scoring_rubric.items():
            if key in {"execution", "test_cases", "starter_code"}:
                continue
            label = str(key).replace("_", " ").strip()
            if isinstance(value, (int, float, str)):
                bullets.append(f"{label}: {value}")
            elif isinstance(value, dict):
                nested_keys = [str(item).replace("_", " ") for item in value.keys() if item not in {"raw_json", "metadata"}]
                if nested_keys:
                    bullets.append(f"{label}: {', '.join(nested_keys[:4])}")
            elif isinstance(value, list):
                cleaned = [str(item).strip() for item in value if str(item).strip()]
                if cleaned:
                    bullets.append(f"{label}: {', '.join(cleaned[:4])}")
            if len(bullets) >= 5:
                break
    if not bullets:
        bullets = [f"Cover expected concept: {concept}" for concept in expected_concepts[:5]]
    return bullets[:5] or ["Evaluate correctness, clarity, and role-relevant technical depth."]


def compact_rubric_from_document(document: RagDocument) -> dict:
    expected = list(document.expected_concepts or [])[:8]
    return {
        "rubric_id": document.id,
        "rubric_title": document.title,
        "category": document.category,
        "expected_concepts": expected,
        "scoring_bullets": scoring_bullets_from_rubric(document.scoring_rubric, expected),
    }


def generic_rubric_key_for_answer(answer) -> str:
    question = answer.assessment_question
    combined = f"{question.question_type or ''} {question.category or ''}".lower()
    if any(term in combined for term in ["debug", "scenario", "failure"]):
        return "debugging"
    if any(term in combined for term in ["system", "architecture", "design"]):
        return "system_design"
    if any(term in combined for term in ["communication", "explain", "collaboration"]):
        return "communication"
    if any(term in combined for term in ["api", "database", "postgres", "sql", "schema"]):
        return "api_database"
    if any(term in combined for term in ["coding", "code", "implementation", "algorithm"]):
        return "code"
    return "technical_reasoning"


def generic_compact_rubric(answer) -> dict:
    base = dict(GENERIC_RUBRIC_LIBRARY[generic_rubric_key_for_answer(answer)])
    question_expected = list(answer.assessment_question.expected_concepts or [])
    if question_expected:
        base["expected_concepts"] = list(dict.fromkeys([*question_expected[:6], *base["expected_concepts"]]))[:8]
    return base


def local_rubric_match_score(profile: CandidateProfile, answer, document: RagDocument) -> float:
    question = answer.assessment_question
    query_terms = local_tokens(
        profile.target_role,
        profile.tech_stack or [],
        profile.skills or [],
        question.question_text,
        question.question_type,
        question.category,
        question.expected_concepts or [],
    )
    document_terms = local_tokens(
        document.title,
        document.role,
        document.category,
        document.question_type,
        document.tech_stack,
        document.tags,
        document.expected_concepts,
        document.embedding_text,
    )
    overlap = len(query_terms & document_terms) / max(1, len(query_terms))
    score = overlap * 70
    if question.category and question.category.lower() in (document.category or "").lower():
        score += 20
    if profile.target_role and (profile.target_role or "").lower() in (document.role or "").lower():
        score += 10
    if set(local_tokens(profile.tech_stack or [])) & set(local_tokens(document.tech_stack or [])):
        score += 10
    return max(0.0, min(100.0, score))


def compact_rubric_context_for_answer(
    db: Session,
    profile: CandidateProfile,
    answer,
    settings,
) -> tuple[list[dict], AIRubricContext]:
    if not settings.enable_rag_evaluation:
        return [], empty_rubric_context(enabled=False)

    local_mode = getattr(settings, "ai_free_tier_mode", False) or getattr(settings, "rag_evaluation_embedding_mode", "external") == "local"
    if not local_mode:
        full_context = retrieve_answer_rubric_context(db, profile, answer)
        compact = [
            {
                "rubric_id": item.document_id,
                "rubric_title": item.title,
                "category": item.category,
                "expected_concepts": item.expected_concepts[:8],
                "scoring_bullets": scoring_bullets_from_rubric(item.scoring_rubric, item.expected_concepts),
            }
            for item in full_context.items
        ]
        if compact:
            return compact, full_context

    try:
        documents = list(
            db.scalars(
                select(RagDocument)
                .where(RagDocument.is_active.is_(True))
                .where(RagDocument.source_type == "rubric")
            ).all()
        )
    except Exception as exc:
        if not settings.enable_rag_evaluation_fallback:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Local RAG rubric retrieval unavailable: {exc}",
            ) from exc
        documents = []

    ranked = sorted(
        [(local_rubric_match_score(profile, answer, document), document) for document in documents],
        key=lambda item: item[0],
        reverse=True,
    )
    selected = [document for score, document in ranked if score > 0][: max(1, getattr(settings, "rag_rubric_top_k", 5))]
    if not selected:
        generic = generic_compact_rubric(answer)
        item = AIRubricContextItem(
            document_id=generic["rubric_id"],
            title=generic["rubric_title"],
            category=generic["category"],
            expected_concepts=generic["expected_concepts"],
            scoring_rubric={"scoring_bullets": generic["scoring_bullets"]},
        )
        context = AIRubricContext(
            rag_enabled=True,
            fallback_used=True,
            items=[item],
            metadata={
                "rag_enabled": True,
                "fallback_used": True,
                "retrieved_document_ids": [generic["rubric_id"]],
                "retrieved_titles": [generic["rubric_title"]],
                "warning": "generic_rubric_fallback",
                "embedding_mode": "local",
            },
        )
        return [generic], context

    compact = [compact_rubric_from_document(document) for document in selected]
    context = AIRubricContext(
        rag_enabled=True,
        fallback_used=False,
        items=[
            AIRubricContextItem(
                document_id=item["rubric_id"],
                title=item["rubric_title"],
                category=item["category"],
                expected_concepts=item["expected_concepts"],
                scoring_rubric={"scoring_bullets": item["scoring_bullets"]},
            )
            for item in compact
        ],
        metadata={
            "rag_enabled": True,
            "fallback_used": False,
            "retrieved_document_ids": [item["rubric_id"] for item in compact],
            "retrieved_titles": [item["rubric_title"] for item in compact],
            "embedding_mode": "local",
        },
    )
    return compact, context


def empty_rubric_context(*, enabled: bool, warning: str | None = None) -> AIRubricContext:
    metadata = {
        "rag_enabled": enabled,
        "fallback_used": False,
        "retrieved_document_ids": [],
        "top_scores": {},
        "why_matched": {},
    }
    if warning:
        metadata["warning"] = warning
    return AIRubricContext(rag_enabled=enabled, fallback_used=False, items=[], metadata=metadata)


def retrieve_answer_rubric_context(
    db: Session,
    profile: CandidateProfile,
    answer,
) -> AIRubricContext:
    settings = get_settings()
    if not settings.enable_rag_evaluation:
        return empty_rubric_context(enabled=False)
    if getattr(settings, "ai_free_tier_mode", False) or getattr(settings, "rag_evaluation_embedding_mode", "external") == "local":
        _, context = compact_rubric_context_for_answer(db, profile, answer, settings)
        return context
    try:
        response = retrieve_rubrics(
            db,
            query_text=build_rubric_query(profile, answer),
            target_role=profile.target_role,
            tech_stack=profile.tech_stack or [],
            limit=settings.rag_rubric_top_k,
        )
    except Exception as exc:
        if not settings.enable_rag_evaluation_fallback:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"RAG rubric retrieval unavailable: {exc}",
            ) from exc
        return empty_rubric_context(enabled=True, warning=f"rubric_retrieval_failed: {exc}")

    if not response.results:
        return empty_rubric_context(enabled=True, warning="no_rubric_docs")

    rubric_docs = {
        document.id: document
        for document in db.scalars(
            select(RagDocument).where(RagDocument.id.in_([result.document_id for result in response.results]))
        )
    }
    items = [
        AIRubricContextItem(
            document_id=result.document_id,
            title=result.title,
            category=result.category,
            tech_stack=result.tech_stack,
            expected_concepts=rubric_docs[result.document_id].expected_concepts
            if result.document_id in rubric_docs
            else [],
            scoring_rubric=rubric_docs[result.document_id].scoring_rubric
            if result.document_id in rubric_docs
            else {},
            score=result.score.model_dump(),
            why_matched=result.why_matched,
        )
        for result in response.results
    ]
    metadata = {
        "rag_enabled": True,
        "fallback_used": response.fallback_used,
        "retrieved_document_ids": [result.document_id for result in response.results],
        "retrieved_titles": [result.title for result in response.results],
        "top_scores": {
            result.document_id: result.score.final_score for result in response.results
        },
        "why_matched": {
            result.document_id: result.why_matched for result in response.results if result.why_matched
        },
        "provider_metadata": response.provider_metadata.model_dump(),
    }
    return AIRubricContext(
        rag_enabled=True,
        fallback_used=response.fallback_used,
        items=items,
        metadata=metadata,
    )


def rubric_metadata_for_answer(context: AIRubricContext) -> dict:
    return {
        "rubric_document_ids": [item.document_id for item in context.items],
        "rubric_titles": [item.title for item in context.items],
        "retrieved_expected_concepts": sorted(
            {
                concept
                for item in context.items
                for concept in item.expected_concepts
            }
        ),
        "rubric_retrieval_metadata": context.metadata,
    }


def rubric_retrieval_summary(contexts: list[AIRubricContext]) -> dict:
    ids: list[str] = []
    warnings: list[str] = []
    fallback_used = False
    for context in contexts:
        fallback_used = fallback_used or context.fallback_used
        warning = context.metadata.get("warning")
        if warning and warning not in warnings:
            warnings.append(warning)
        for item in context.items:
            if item.document_id not in ids:
                ids.append(item.document_id)
    return {
        "rag_enabled": any(context.rag_enabled for context in contexts),
        "fallback_used": fallback_used,
        "answer_count": len(contexts),
        "answers_with_rubrics": sum(1 for context in contexts if context.items),
        "rubric_document_ids_used": ids,
        "warnings": warnings,
    }


def trim_text(value, max_chars: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if len(text) <= max_chars:
        return text
    return f"{text[: max(0, max_chars - 15)].rstrip()} [truncated]"


def compact_string_list(values, *, limit: int, item_max_chars: int = 80) -> list[str]:
    result: list[str] = []
    for value in values or []:
        text = trim_text(value, item_max_chars)
        if text and text not in result:
            result.append(text)
        if len(result) >= limit:
            break
    return result


def compact_code_run_summary(latest_run_result) -> dict | None:
    if not isinstance(latest_run_result, dict):
        return None
    failed = []
    for item in latest_run_result.get("test_results") or []:
        if isinstance(item, dict) and not item.get("passed"):
            failed.append(
                {
                    "name": trim_text(item.get("name"), 60),
                    "expected": trim_text(item.get("expected_output"), 120),
                    "actual": trim_text(item.get("actual_output"), 120),
                    "error": trim_text(item.get("error"), 120),
                }
            )
        if len(failed) >= 2:
            break
    return {
        "status": latest_run_result.get("status"),
        "passed_count": latest_run_result.get("passed_count"),
        "failed_count": latest_run_result.get("failed_count"),
        "total_count": latest_run_result.get("total_count"),
        "runtime_ms": latest_run_result.get("runtime_ms"),
        "message": trim_text(latest_run_result.get("message"), 160),
        "failed_tests": failed,
    }


def compact_integrity_summary(integrity_summary) -> dict:
    payload = integrity_summary.model_dump()
    return {
        "integrity_score": payload.get("integrity_score"),
        "risk_level": payload.get("risk_level"),
        "suspicious_event_count": payload.get("suspicious_event_count"),
        "summary": trim_text(payload.get("summary"), 240),
    }


def compact_rubric_bullets(rubrics: list[dict], *, max_bullets: int = 3, max_total_chars: int = 300) -> list[str]:
    bullets: list[str] = []
    used_chars = 0
    for rubric in rubrics or []:
        title = trim_text(rubric.get("rubric_title"), 48) or "Rubric"
        for bullet in rubric.get("scoring_bullets") or []:
            text = trim_text(bullet, 110)
            if not text:
                continue
            line = f"{title}: {text}"
            remaining = max_total_chars - used_chars
            if remaining <= 0 or len(bullets) >= max_bullets:
                return bullets
            if len(line) > remaining:
                line = trim_text(line, remaining) or ""
            if line:
                bullets.append(line)
                used_chars += len(line)
            if len(bullets) >= max_bullets:
                return bullets
    return bullets


def compact_rubric_context_items(rubrics: list[dict]) -> list[dict]:
    compact: list[dict] = []
    for rubric in (rubrics or [])[:2]:
        compact.append(
            {
                "rubric_id": rubric.get("rubric_id"),
                "rubric_title": trim_text(rubric.get("rubric_title"), 80),
                "category": trim_text(rubric.get("category"), 60),
                "expected_concepts": compact_string_list(
                    rubric.get("expected_concepts") or [], limit=5, item_max_chars=70
                ),
                "scoring_bullets": compact_string_list(
                    rubric.get("scoring_bullets") or [], limit=3, item_max_chars=110
                ),
            }
        )
    return compact


def compressed_question_rubric(answer) -> dict:
    question = answer.assessment_question
    rubric = question.scoring_rubric or {}
    execution = rubric.get("execution") if isinstance(rubric, dict) else None
    return {
        "category": question.category,
        "question_type": question.question_type,
        "expected_concepts": compact_string_list(question.expected_concepts or [], limit=5, item_max_chars=70),
        "scoring_keys": compact_string_list(list(rubric.keys()) if isinstance(rubric, dict) else [], limit=5),
        "execution_supported": execution.get("execution_supported") if isinstance(execution, dict) else None,
    }


def build_batch_evaluation_payload(
    profile: CandidateProfile,
    session: AssessmentSession,
    answers,
    integrity_summary,
    compact_rubrics_by_question: dict[str, list[dict]] | None = None,
) -> dict:
    compact_rubrics_by_question = compact_rubrics_by_question or {}
    questions = []
    for answer in answers:
        question = answer.assessment_question
        rubrics = compact_rubrics_by_question.get(answer.assessment_question_id, [])
        answer_metadata = answer.answer_metadata or {}
        objective_result = objective_result_for(answer)
        rubric_context = compact_rubric_context_items(rubrics)
        primary_rubric = (rubric_context[:1] or [generic_compact_rubric(answer)])[0]
        questions.append(
            {
                "question": {
                    "question_id": answer.assessment_question_id,
                    "assessment_question_id": answer.assessment_question_id,
                    "display_order": answer.order_index + 1,
                    "order_index": answer.order_index,
                    "question_text": trim_text(question.question_text, 700),
                    "question_type": question.question_type,
                    "question_mode": question.question_type,
                    "category": question.category,
                    "difficulty": question.difficulty,
                    "expected_concepts": compact_string_list(
                        question.expected_concepts or [], limit=5, item_max_chars=70
                    ),
                    "must_have_concepts": compact_string_list(
                        (question.scoring_rubric or {}).get("must_have_concepts", [])
                        if isinstance(question.scoring_rubric, dict)
                        else [],
                        limit=5,
                        item_max_chars=70,
                    ),
                    "compact_rubric": compact_rubric_bullets(rubrics),
                    "rubric_context": rubric_context,
                    "rubric": {
                        "rubric_id": primary_rubric.get("rubric_id"),
                        "category": primary_rubric.get("category"),
                        "expected_concepts": compact_string_list(
                            primary_rubric.get("expected_concepts") or [],
                            limit=3,
                            item_max_chars=45,
                        ),
                    },
                },
                "answer": {
                    "answer_status": answer_status_for(answer),
                    "answer_text": trim_text(answer.answer_text, 1200),
                    "code_text": trim_text(answer.code_text, 2000),
                    "code_run_summary": compact_code_run_summary(answer_metadata.get("latest_run_result")),
                    "mcq_selected_option": answer_metadata.get("selected_option_id"),
                    "mcq_is_correct": objective_result.get("is_correct") if objective_result else None,
                    "objective_result": objective_result,
                },
            }
        )
    return {
        "mode": "free_tier_batch_v1",
        "profile": {
            "target_role": profile.target_role,
            "experience_level": profile.experience_level,
            "tech_stack": compact_string_list(profile.tech_stack or [], limit=8, item_max_chars=50),
            "skills": compact_string_list(profile.skills or [], limit=8, item_max_chars=50),
        },
        "session": {
            "session_id": session.id,
            "target_role": session.target_role,
            "experience_level": session.experience_level,
            "selected_difficulty": session.selected_difficulty,
            "total_questions": session.total_questions,
        },
        "integrity_summary": compact_integrity_summary(integrity_summary),
        "questions": questions,
    }


def strongly_compress_batch_payload(payload: dict) -> dict:
    payload = json.loads(json.dumps(payload, ensure_ascii=True))
    for item in payload.get("questions") or []:
        question = item.get("question") or {}
        answer = item.get("answer") or {}
        question["question_text"] = trim_text(question.get("question_text"), 360)
        question["expected_concepts"] = compact_string_list(question.get("expected_concepts") or [], limit=4, item_max_chars=45)
        question["must_have_concepts"] = compact_string_list(question.get("must_have_concepts") or [], limit=4, item_max_chars=45)
        question["compact_rubric"] = compact_string_list(question.get("compact_rubric") or [], limit=2, item_max_chars=90)
        question["rubric_context"] = compact_rubric_context_items(question.get("rubric_context") or [])[:1]
        primary_rubric = (question.get("rubric_context") or [{}])[0]
        question["rubric"] = {
            "rubric_id": primary_rubric.get("rubric_id"),
            "category": primary_rubric.get("category"),
            "expected_concepts": compact_string_list(
                primary_rubric.get("expected_concepts") or [],
                limit=2,
                item_max_chars=35,
            ),
        }
        answer["answer_text"] = trim_text(answer.get("answer_text"), 650)
        answer["code_text"] = trim_text(answer.get("code_text"), 900)
        if isinstance(answer.get("code_run_summary"), dict):
            answer["code_run_summary"].pop("failed_tests", None)
    return payload


def batch_payload_size_summary(payload: dict) -> dict[str, int]:
    questions = payload.get("questions") or []
    answer_chars = 0
    rubric_chars = 0
    metadata_chars = 0
    for item in questions:
        answer = item.get("answer") or {}
        question = item.get("question") or {}
        answer_chars += len(str(answer.get("answer_text") or ""))
        answer_chars += len(str(answer.get("code_text") or ""))
        rubric_chars += len(json.dumps(question.get("rubric_context") or [], ensure_ascii=True))
        rubric_chars += len(json.dumps(question.get("compact_rubric") or [], ensure_ascii=True))
        metadata_chars += len(json.dumps(answer.get("code_run_summary") or {}, ensure_ascii=True))
    system_prompt = batch_evaluation_system_prompt(payload)
    user_prompt = batch_evaluation_user_prompt(payload)
    return {
        "question_count": len(questions),
        "answer_count": sum(1 for item in questions if (item.get("answer") or {}).get("answer_status") != "skipped"),
        "total_answer_chars": answer_chars,
        "system_prompt_chars": len(system_prompt),
        "user_payload_chars": len(user_prompt),
        "rubric_chars": rubric_chars,
        "metadata_chars": metadata_chars,
        "total_estimated_chars": len(system_prompt) + len(user_prompt),
    }


def batch_answer_evaluations_by_question(
    draft: AIBatchEvaluationDraft,
) -> dict[str, AICompactQuestionEvaluation]:
    return {
        item.question_id: item
        for item in draft.question_evaluations
    }


def compact_status_to_report_status(status_label: str) -> str:
    if status_label == "skipped":
        return "skipped"
    if status_label in {"insufficient", "insufficient_response"}:
        return "insufficient_response"
    return "answered"


def compact_question_to_answer_evaluation(
    compact: AICompactQuestionEvaluation,
) -> AIAnswerEvaluation:
    score = max(0, min(100, int(compact.score)))
    normalized_status = compact_status_to_report_status(compact.answer_status)
    if normalized_status == "skipped":
        score = 0
    elif normalized_status == "insufficient_response":
        score = min(score, 20)
    if compact.suggested_score_cap is not None:
        score = min(score, compact.suggested_score_cap)
    feedback_parts = [compact.feedback.strip(), compact.improvement_tip.strip()]
    feedback = " ".join(part for part in feedback_parts if part).strip()
    missing_concepts = list(dict.fromkeys([*compact.missing_concepts, *compact.must_have_missing]))
    covered_concepts = list(dict.fromkeys([*compact.strengths, *compact.must_have_covered]))
    return AIAnswerEvaluation(
        technical_accuracy=score,
        problem_solving=score,
        communication_clarity=score,
        reasoning_depth=score,
        code_quality=score,
        expected_concepts_covered=covered_concepts,
        missing_concepts=missing_concepts,
        confidence=max(0, min(100, int(compact.confidence))),
        short_feedback=feedback or "Assessment answer evaluated in batch mode.",
        transcript_evidence=covered_concepts[:2] or [compact.feedback or "Batch question evaluation."],
    )


def fallback_batch_evaluation(answer, status_label: str) -> AIAnswerEvaluation:
    if status_label in {"skipped", "insufficient_response"}:
        return insufficient_answer_evaluation(answer, status_label)
    question = answer.assessment_question
    expected = list(question.expected_concepts or [])
    return AIAnswerEvaluation(
        technical_accuracy=20,
        problem_solving=20,
        communication_clarity=20,
        reasoning_depth=20,
        code_quality=20,
        expected_concepts_covered=[],
        missing_concepts=expected,
        confidence=65,
        short_feedback="No AI question evaluation was returned for this question; conservative low score applied.",
        transcript_evidence=["Missing question-wise batch evaluation."],
    )


def project_quality_from_batch(profile: CandidateProfile, draft: AIBatchEvaluationDraft) -> AIProjectQualityEvaluation:
    scores = draft.category_scores
    technical_average = int(
        round(
            (
                scores.technical_accuracy
                + scores.problem_solving
                + scores.code_quality
                + scores.system_design
            )
            / 4
        )
    )
    communication = scores.communication
    return AIProjectQualityEvaluation(
        project_quality_score=technical_average,
        clarity_score=communication,
        technical_depth_score=scores.technical_accuracy,
        role_relevance_score=technical_average if profile.target_role else min(technical_average, 55),
        stack_alignment_score=scores.technical_accuracy if profile.tech_stack else min(scores.technical_accuracy, 55),
        complexity_score=scores.system_design,
        impact_score=technical_average,
        summary=draft.candidate_summary or "Batch evaluation summarized profile and assessment evidence.",
        limitations=["Project/profile quality is derived from the compact batch evaluation response."],
    )


def final_report_from_batch(
    profile: CandidateProfile,
    draft: AIBatchEvaluationDraft,
    aggregate_scores: dict[str, int],
) -> AIFinalReportDraft:
    role = profile.target_role or "Target Role"
    transcript_evidence = [
        item.feedback
        for item in draft.question_evaluations
        if item.feedback
    ][:5]
    return AIFinalReportDraft(
        strengths=draft.overall_strengths or ["Assessment completed with evaluable evidence."],
        weaknesses=draft.overall_growth_areas or ["Review missed concepts and weak answers."],
        recommended_improvements=draft.recommended_next_steps or ["Practice weak areas before retaking."],
        role_fit=[
            {
                "role": role,
                "score": aggregate_scores["ai_test_score"],
                "reason": draft.role_fit_summary or f"Fit estimated from the batched {role} assessment.",
            }
        ],
        recruiter_summary=draft.recruiter_summary or draft.candidate_summary or "Batch evaluation completed.",
        transcript_evidence=transcript_evidence or [draft.candidate_summary or "Batch evaluation evidence."],
    )


def generate_batched_evaluation_report(
    db: Session,
    session: AssessmentSession,
    existing: EvaluationReport | None,
    provider: FallbackAIProvider | None = None,
    provider_name: str | None = None,
) -> EvaluationReport:
    settings = get_settings()
    profile = session.candidate
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")

    answers = session_question_answers(session)
    frozen_question_ids = validate_report_source_of_truth(session, answers)
    integrity_summary = integrity_summary_for_session(db, session)
    compact_rubrics_by_question: dict[str, list[dict]] = {}
    rubric_contexts: list[AIRubricContext] = []
    for answer in answers:
        compact_rubrics, rubric_context = compact_rubric_context_for_answer(db, profile, answer, settings)
        compact_rubrics_by_question[answer.assessment_question_id] = compact_rubrics
        rubric_contexts.append(rubric_context)
    ai_provider = provider or build_ai_provider(provider_name)
    batch_payload = build_batch_evaluation_payload(
        profile,
        session,
        answers,
        integrity_summary,
        compact_rubrics_by_question,
    )
    payload_question_ids = [
        (item.get("question") or {}).get("assessment_question_id")
        for item in batch_payload.get("questions", [])
    ]
    logger.info(
        "[REPORT_PAYLOAD_QUESTION_IDS] session_id=%s report_payload_question_ids=%s",
        session.id,
        payload_question_ids,
    )
    before_payload_summary = batch_payload_size_summary(batch_payload)
    payload_summary = before_payload_summary
    compression_applied = False
    if before_payload_summary["total_estimated_chars"] > 15000:
        batch_payload = strongly_compress_batch_payload(batch_payload)
        payload_summary = batch_payload_size_summary(batch_payload)
        compression_applied = True
    logger.info(
        "[EVALUATION_PAYLOAD_SIZE] session_id=%s before_chars=%s after_chars=%s "
        "question_count=%s answer_count=%s compression_applied=%s",
        session.id,
        before_payload_summary["total_estimated_chars"],
        payload_summary["total_estimated_chars"],
        payload_summary["question_count"],
        payload_summary["answer_count"],
        compression_applied,
    )
    logger.info(
        "[EVALUATION_PAYLOAD] session_id=%s question_count=%s answer_count=%s answer_chars=%s "
        "system_chars=%s user_payload_chars=%s rubric_chars=%s metadata_chars=%s total_chars=%s",
        session.id,
        payload_summary["question_count"],
        payload_summary["answer_count"],
        payload_summary["total_answer_chars"],
        payload_summary["system_prompt_chars"],
        payload_summary["user_payload_chars"],
        payload_summary["rubric_chars"],
        payload_summary["metadata_chars"],
        payload_summary["total_estimated_chars"],
    )
    if payload_summary["total_estimated_chars"] > getattr(settings, "ai_evaluation_large_payload_warning_chars", 20000):
        logger.warning(
            "[EVALUATION_PAYLOAD_LARGE] session_id=%s total_chars=%s threshold=%s",
            session.id,
            payload_summary["total_estimated_chars"],
            getattr(settings, "ai_evaluation_large_payload_warning_chars", 20000),
        )
    try:
        logger.info("[REPORT_GENERATE_START] session_id=%s", session.id)
        draft = ai_provider.evaluate_assessment_batch(batch_payload)
    except ProviderOutputError as exc:
        provider_metadata = ai_provider.state.metadata()
        rate_limited = (
            "rate_limited" in str(exc).lower()
            or "429" in str(exc).lower()
            or "provider_cooldown_active" in str(exc).lower()
            or provider_metadata.failure_reason.get("deepseek") == "rate_limited"
            or provider_metadata.failure_reason.get("deepseek") == "provider_cooldown_active"
            or provider_metadata.failure_reason.get("openrouter") == "rate_limited"
            or provider_metadata.failure_reason.get("openrouter") == "provider_cooldown_active"
            or provider_metadata.failure_reason.get("gemini") == "rate_limited"
            or provider_metadata.failure_reason.get("gemini") == "provider_cooldown_active"
            or provider_metadata.failure_reason.get("nvidia") == "rate_limited"
            or provider_metadata.failure_reason.get("nvidia") == "provider_cooldown_active"
        )
        if settings.ai_required_for_evaluation and not settings.allow_stub_evaluation:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS if rate_limited else status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=_provider_unavailable_detail(provider_metadata, rate_limited=rate_limited, settings=settings),
            ) from exc
        raise
    provider_metadata = ai_provider.state.metadata()
    audit = current_report_audit()
    if audit and audit.total_ai_calls > getattr(settings, "evaluation_max_ai_calls_per_report", 1):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_max_ai_calls_exceeded_detail(settings),
        )
    if (
        settings.ai_required_for_evaluation
        and not settings.allow_stub_evaluation
        and provider_metadata.actual_provider == "stub"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Real AI evaluation is required, but no real AI provider completed the batch evaluation.",
        )

    validated_missing_question_ids = validate_batch_ai_question_ids(session, frozen_question_ids, draft)
    batch_evaluations = batch_answer_evaluations_by_question(draft)
    answer_evaluations: list[AIAnswerEvaluation] = []
    missing_batch_question_ids = [
        answer.assessment_question_id
        for answer in answers
        if answer.assessment_question_id not in batch_evaluations and objective_result_for(answer) is None
    ]
    missing_batch_question_ids = list(dict.fromkeys([*missing_batch_question_ids, *validated_missing_question_ids]))
    for answer in answers:
        original_status = answer_status_for(answer)
        compact_evaluation = batch_evaluations.get(answer.assessment_question_id)
        objective_result = objective_result_for(answer)
        if objective_result is not None:
            status_label = "answered"
            evaluation = objective_answer_evaluation(answer, objective_result)
        elif original_status in {"skipped", "insufficient_response"}:
            status_label = original_status
            evaluation = insufficient_answer_evaluation(answer, status_label)
        elif compact_evaluation is None:
            status_label = "insufficient_response"
            evaluation = fallback_batch_evaluation(answer, status_label)
        else:
            status_label = compact_status_to_report_status(compact_evaluation.answer_status)
            evaluation = compact_question_to_answer_evaluation(compact_evaluation)
        evaluation, cap_metadata = apply_deterministic_score_caps(answer, evaluation, compact_evaluation)
        rubric_context = rubric_contexts[len(answer_evaluations)]
        answer.ai_evaluation = {
            **(answer.ai_evaluation or {}),
            **evaluation.model_dump(),
            **rubric_metadata_for_answer(rubric_context),
            "answer_status": status_label,
            "skill_area": compact_evaluation.skill_area if compact_evaluation is not None else answer.assessment_question.category,
            "batch_missing_question_evaluation": compact_evaluation is None,
            "missing_concepts": evaluation.missing_concepts,
            "evidence_found": cap_metadata["evidence_found"],
            "generic_answer_flags": cap_metadata["generic_answer_flags"],
            "applied_score_caps": cap_metadata["applied_score_caps"],
            "feedback_summary": cap_metadata["feedback_summary"],
        }
        answer_evaluations.append(evaluation)

    project_quality = project_quality_from_batch(profile, draft)
    capped_project_score, project_score_source = capped_project_quality(
        profile, project_quality.project_quality_score
    )
    project_quality.project_quality_score = capped_project_score
    aggregate_scores = aggregate_answer_scores(answers, answer_evaluations)
    academic_score, academic_score_source = normalize_gpa(profile.gpa)
    integrity_score = integrity_summary.integrity_score
    integrity_penalty = integrity_penalty_for_score(integrity_score)
    verified_score = calculate_verified_score(
        aggregate_scores["ai_test_score"],
        project_quality,
        aggregate_scores["communication_score"],
        academic_score,
        integrity_score=integrity_score,
    )
    final_draft = final_report_from_batch(profile, draft, aggregate_scores)
    recruiter_summary = final_draft.recruiter_summary
    if integrity_summary.risk_level in {"moderate", "high"}:
        recruiter_summary = (
            f"{recruiter_summary} Integrity review: {integrity_summary.risk_level} risk "
            f"({integrity_score}/100). {integrity_summary.summary}"
        )
    rubric_summary = rubric_retrieval_summary(rubric_contexts)
    report_question_evaluations = question_wise_scores(answers, answer_evaluations)
    report_json = {
        "evaluation_mode": "batch",
        "free_tier_mode": settings.ai_free_tier_mode,
        "ai_call_budget": settings.evaluation_max_ai_calls_per_report,
        "ai_call_summary": current_ai_call_summary(status_label="success"),
        "backend_default_provider": getattr(settings, "default_ai_provider", None),
        "selected_provider": provider_metadata.requested_provider,
        "provider_metadata": provider_metadata.model_dump(),
        "batch_response_schema": "compact_v1",
        "batch_payload_size_summary": payload_summary,
        "batch_category_scores": draft.category_scores.model_dump(),
        "batch_missing_question_ids": missing_batch_question_ids,
        "candidate_summary": draft.candidate_summary,
        "role_fit_summary": draft.role_fit_summary,
        "improvement_plan": [item.model_dump() for item in draft.improvement_plan],
        "ai_test_score": aggregate_scores["ai_test_score"],
        "technical_score": aggregate_scores["technical_score"],
        "communication_score": aggregate_scores["communication_score"],
        "problem_solving_score": aggregate_scores["problem_solving_score"],
        "system_design_score": aggregate_scores["system_design_score"],
        "code_quality_score": aggregate_scores["code_quality_score"],
        "project_quality_score": project_quality.project_quality_score,
        "project_quality": project_quality.model_dump(),
        "project_score_source": project_score_source,
        "academic_score": academic_score,
        "academic_score_source": academic_score_source,
        "integrity_score": integrity_score,
        "integrity_penalty": integrity_penalty,
        "integrity_summary": integrity_summary.model_dump(),
        "verified_score": verified_score,
        "strengths": final_draft.strengths,
        "weaknesses": final_draft.weaknesses,
        "recommended_improvements": final_draft.recommended_improvements,
        "role_fit": final_draft.role_fit,
        "recruiter_summary": recruiter_summary,
        "transcript_evidence": final_draft.transcript_evidence,
        "question_wise_scores": report_question_evaluations,
        "question_evaluations": report_question_evaluations,
        "rubric_retrieval_summary": rubric_summary,
        "rubric_document_ids_used": rubric_summary["rubric_document_ids_used"],
    }

    report = existing or EvaluationReport(session_id=session.id, candidate_id=session.candidate_id)
    if existing is None:
        db.add(report)
    report.ai_test_score = aggregate_scores["ai_test_score"]
    report.technical_score = aggregate_scores["technical_score"]
    report.communication_score = aggregate_scores["communication_score"]
    report.problem_solving_score = aggregate_scores["problem_solving_score"]
    report.system_design_score = aggregate_scores["system_design_score"]
    report.code_quality_score = aggregate_scores["code_quality_score"]
    report.project_quality_score = project_quality.project_quality_score
    report.academic_score = academic_score
    report.integrity_score = integrity_score
    report.verified_score = verified_score
    report.report_json = report_json
    report.recruiter_summary = recruiter_summary

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raced_report = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
        if raced_report is not None:
            logger.info("[REPORT_GENERATE_END] session_id=%s status=raced_existing", session.id)
            return raced_report
        raise
    db.refresh(report)
    logger.info("[REPORT_GENERATE_END] session_id=%s status=success", session.id)
    return report


def _generate_evaluation_report_unlocked(
    db: Session,
    session: AssessmentSession,
    existing: EvaluationReport | None,
    settings,
    provider: FallbackAIProvider | None = None,
    provider_name: str | None = None,
) -> EvaluationReport:
    if settings.batch_evaluation_enabled:
        return generate_batched_evaluation_report(
            db,
            session,
            existing,
            provider=provider,
            provider_name=provider_name,
        )

    profile = session.candidate
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")

    ai_provider = provider or build_ai_provider(provider_name)
    answers = session_question_answers(session)
    validate_report_source_of_truth(session, answers)
    answer_evaluations: list[AIAnswerEvaluation] = []
    rubric_contexts: list[AIRubricContext] = []
    for answer in answers:
        status_label = answer_status_for(answer)
        if status_label in {"skipped", "insufficient_response"}:
            rubric_context = empty_rubric_context(enabled=get_settings().enable_rag_evaluation, warning=status_label)
            evaluation = insufficient_answer_evaluation(answer, status_label)
        else:
            rubric_context = retrieve_answer_rubric_context(db, profile, answer)
            evaluation = ai_provider.evaluate_answer(profile, answer, rubric_context)
        evaluation, cap_metadata = apply_deterministic_score_caps(answer, evaluation, None)
        answer.ai_evaluation = {
            **evaluation.model_dump(),
            **rubric_metadata_for_answer(rubric_context),
            "answer_status": status_label,
            "missing_concepts": evaluation.missing_concepts,
            "evidence_found": cap_metadata["evidence_found"],
            "generic_answer_flags": cap_metadata["generic_answer_flags"],
            "applied_score_caps": cap_metadata["applied_score_caps"],
            "feedback_summary": cap_metadata["feedback_summary"],
        }
        answer_evaluations.append(evaluation)
        rubric_contexts.append(rubric_context)

    project_quality = ai_provider.evaluate_project_profile(profile)
    capped_project_score, project_score_source = capped_project_quality(
        profile, project_quality.project_quality_score
    )
    project_quality.project_quality_score = capped_project_score
    aggregate_scores = aggregate_answer_scores(answers, answer_evaluations)
    academic_score, academic_score_source = normalize_gpa(profile.gpa)
    integrity_summary = integrity_summary_for_session(db, session)
    integrity_score = integrity_summary.integrity_score
    integrity_penalty = integrity_penalty_for_score(integrity_score)
    verified_score = calculate_verified_score(
        aggregate_scores["ai_test_score"],
        project_quality,
        aggregate_scores["communication_score"],
        academic_score,
        integrity_score=integrity_score,
    )
    final_draft = ai_provider.generate_final_report(
        profile, answers, answer_evaluations, project_quality, aggregate_scores
    )
    recruiter_summary = final_draft.recruiter_summary
    if integrity_summary.risk_level in {"moderate", "high"}:
        recruiter_summary = (
            f"{recruiter_summary} Integrity review: {integrity_summary.risk_level} risk "
            f"({integrity_score}/100). {integrity_summary.summary}"
        )
    provider_metadata = ai_provider.state.metadata()
    rubric_summary = rubric_retrieval_summary(rubric_contexts)
    report_question_evaluations = question_wise_scores(answers, answer_evaluations)
    report_json = {
        "provider_metadata": provider_metadata.model_dump(),
        "ai_test_score": aggregate_scores["ai_test_score"],
        "technical_score": aggregate_scores["technical_score"],
        "communication_score": aggregate_scores["communication_score"],
        "problem_solving_score": aggregate_scores["problem_solving_score"],
        "system_design_score": aggregate_scores["system_design_score"],
        "code_quality_score": aggregate_scores["code_quality_score"],
        "project_quality_score": project_quality.project_quality_score,
        "project_quality": project_quality.model_dump(),
        "project_score_source": project_score_source,
        "academic_score": academic_score,
        "academic_score_source": academic_score_source,
        "integrity_score": integrity_score,
        "integrity_penalty": integrity_penalty,
        "integrity_summary": integrity_summary.model_dump(),
        "verified_score": verified_score,
        "strengths": final_draft.strengths,
        "weaknesses": final_draft.weaknesses,
        "recommended_improvements": final_draft.recommended_improvements,
        "role_fit": final_draft.role_fit,
        "recruiter_summary": recruiter_summary,
        "transcript_evidence": final_draft.transcript_evidence,
        "question_wise_scores": report_question_evaluations,
        "question_evaluations": report_question_evaluations,
        "rubric_retrieval_summary": rubric_summary,
        "rubric_document_ids_used": rubric_summary["rubric_document_ids_used"],
    }

    if existing is None:
        report = EvaluationReport(session_id=session.id, candidate_id=session.candidate_id)
        db.add(report)
    else:
        report = existing
    report.ai_test_score = aggregate_scores["ai_test_score"]
    report.technical_score = aggregate_scores["technical_score"]
    report.communication_score = aggregate_scores["communication_score"]
    report.problem_solving_score = aggregate_scores["problem_solving_score"]
    report.system_design_score = aggregate_scores["system_design_score"]
    report.code_quality_score = aggregate_scores["code_quality_score"]
    report.project_quality_score = project_quality.project_quality_score
    report.academic_score = academic_score
    report.integrity_score = integrity_score
    report.verified_score = verified_score
    report.report_json = report_json
    report.recruiter_summary = recruiter_summary

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raced_report = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
        if raced_report is not None:
            return raced_report
        raise
    db.refresh(report)
    return report


def generate_evaluation_report(
    db: Session,
    session: AssessmentSession,
    force_regenerate: bool = False,
    provider: FallbackAIProvider | None = None,
    provider_name: str | None = None,
) -> EvaluationReport:
    ensure_session_ready(session)
    settings = get_settings()

    existing = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
    if existing is not None and not force_regenerate:
        logger.info("[REPORT_GENERATE_END] session_id=%s status=existing", session.id)
        return existing

    if getattr(settings, "report_generation_lock_enabled", False):
        lock_ttl_seconds = int(getattr(settings, "redis_report_lock_ttl_seconds", 300))
        lock_key = report_generation_lock_key(session.id)
        lock_token = str(uuid.uuid4())
        redis_lock = acquire_lock(lock_key, lock_token, lock_ttl_seconds)
        memory_lock: threading.Lock | None = None
        acquired = redis_lock.acquired
        if acquired is None:
            memory_lock = report_generation_lock(session.id)
            acquired = memory_lock.acquire(blocking=False)
        if not acquired:
            logger.info("[REPORT_GENERATE_DUPLICATE_BLOCKED] session_id=%s", session.id)
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail=generation_in_progress_detail(
                    session.id,
                    redis_enabled=redis_lock.redis_enabled,
                    fallback_to_memory_lock=redis_lock.fallback_to_memory,
                    lock_ttl_seconds=lock_ttl_seconds,
                ),
            )
        try:
            with report_ai_audit(
                session.id,
                max_ai_calls=getattr(settings, "evaluation_max_ai_calls_per_report", 1),
            ) as audit:
                try:
                    report = _generate_evaluation_report_unlocked(
                        db,
                        session,
                        existing,
                        settings,
                        provider=provider,
                        provider_name=provider_name,
                    )
                    log_report_ai_summary(audit, status="success")
                    return report
                except HTTPException as exc:
                    reason = None
                    fallback_skipped = False
                    if isinstance(exc.detail, dict):
                        reason = str(exc.detail.get("reason") or exc.detail.get("code") or "")
                        fallback_skipped = bool(exc.detail.get("fallback_skipped"))
                    log_report_ai_summary(
                        audit,
                        status="failed",
                        reason=reason or str(exc.status_code),
                        fallback_skipped=fallback_skipped,
                    )
                    raise
                except Exception as exc:
                    log_report_ai_summary(audit, status="failed", reason=str(exc))
                    raise
        finally:
            if redis_lock.acquired is True:
                release_lock(lock_key, lock_token)
            if memory_lock is not None:
                memory_lock.release()
    with report_ai_audit(
        session.id,
        max_ai_calls=getattr(settings, "evaluation_max_ai_calls_per_report", 1),
    ) as audit:
        try:
            report = _generate_evaluation_report_unlocked(
                db,
                session,
                existing,
                settings,
                provider=provider,
                provider_name=provider_name,
            )
            log_report_ai_summary(audit, status="success")
            return report
        except HTTPException as exc:
            reason = None
            fallback_skipped = False
            if isinstance(exc.detail, dict):
                reason = str(exc.detail.get("reason") or exc.detail.get("code") or "")
                fallback_skipped = bool(exc.detail.get("fallback_skipped"))
            log_report_ai_summary(
                audit,
                status="failed",
                reason=reason or str(exc.status_code),
                fallback_skipped=fallback_skipped,
            )
            raise
        except Exception as exc:
            log_report_ai_summary(audit, status="failed", reason=str(exc))
            raise


def generate_report_for_user(
    db: Session,
    user: User,
    session_id: str,
    force_regenerate: bool = False,
    provider_name: str | None = None,
) -> EvaluationReport:
    session = session_for_user(db, session_id, user)
    return generate_evaluation_report(db, session, force_regenerate=force_regenerate, provider_name=provider_name)


def _as_list(value) -> list:
    return value if isinstance(value, list) else []


def _short_report_context(report: EvaluationReport) -> dict:
    report_json = report.report_json or {}
    questions = _as_list(report_json.get("question_wise_scores"))
    weak_questions = sorted(
        [
            item
            for item in questions
            if isinstance(item, dict)
        ],
        key=lambda item: int(item.get("score") or 0),
    )[:4]
    return {
        "verified_score": report.verified_score,
        "technical_score": report.technical_score,
        "problem_solving_score": report.problem_solving_score,
        "system_design_score": report.system_design_score,
        "communication_score": report.communication_score,
        "code_quality_score": report.code_quality_score,
        "integrity_score": report.integrity_score,
        "weaknesses": _as_list(report_json.get("weaknesses"))[:6],
        "recommended_improvements": _as_list(report_json.get("recommended_improvements"))[:6],
        "weak_questions": [
            {
                "question": item.get("question_text"),
                "score": item.get("score"),
                "answer_status": item.get("answer_status"),
                "category": item.get("category"),
                "question_type": item.get("question_type"),
                "missing_concepts": item.get("weaknesses"),
                "improvement_advice": item.get("improvement_advice"),
            }
            for item in weak_questions
        ],
    }


def build_coach_prompt(report: EvaluationReport, payload: CoachReportRequest) -> str:
    prompt_labels = {
        "explain_weakest_question": "Explain the weakest question and how to improve it.",
        "practice_questions": "Generate practice questions for the weakest skills.",
        "code_quality_help": "Give code quality improvement advice based on this report.",
        "study_plan": "Create a practical study plan from this report.",
        "rewrite_weak_answer": "Show how to rewrite one weak answer at a high level.",
        "custom": payload.message or "Give concise improvement advice.",
    }
    return "\n".join(
        [
            f"Coach request: {prompt_labels[payload.prompt_type]}",
            f"Candidate message: {payload.message or ''}",
            f"Report context: {_short_report_context(report)}",
        ]
    )


def coach_report_for_user(
    report: EvaluationReport,
    payload: CoachReportRequest,
    provider_name: str | None = None,
) -> CoachReportResponse:
    provider = build_ai_provider(provider_name, capability="evaluation")
    draft = provider.generate_coach_response(build_coach_prompt(report, payload))
    return CoachReportResponse(
        answer=draft.answer.strip(),
        provider_metadata=provider.state.metadata(),
        cached=False,
    )


def publish_report(db: Session, report: EvaluationReport) -> EvaluationReport:
    report.published = True
    if report.candidate is not None:
        report.candidate.profile_visibility = True
        try:
            from app.services.candidate_embedding_service import rebuild_candidate_embedding

            rebuild_candidate_embedding(db, report.candidate, report=report, commit=False)
        except Exception as exc:
            report_json = dict(report.report_json or {})
            report_json["embedding_rebuild_warning"] = str(exc)
            report.report_json = report_json
    db.commit()
    db.refresh(report)
    return report
