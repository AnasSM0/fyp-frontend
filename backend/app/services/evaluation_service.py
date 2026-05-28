from types import SimpleNamespace
import re
import threading

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
from app.services.ai_provider import FallbackAIProvider
from app.services.ai_provider import ProviderOutputError
from app.services.ai_provider_factory import build_ai_provider
from app.services.integrity_service import integrity_penalty_for_score, integrity_summary_for_session
from app.services.scoring_service import (
    aggregate_answer_scores,
    calculate_verified_score,
    capped_project_quality,
    normalize_gpa,
)
from app.services.rag_retrieval_service import retrieve_rubrics

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


def question_wise_scores(
    answers,
    evaluations: list[AIAnswerEvaluation],
) -> list[dict]:
    return [
        {
            "answer_id": answer.id,
            "assessment_question_id": answer.assessment_question_id,
            "question_bank_id": answer.question_bank_id,
            "order_index": answer.order_index,
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


def compressed_question_rubric(answer) -> dict:
    question = answer.assessment_question
    rubric = question.scoring_rubric or {}
    execution = rubric.get("execution") if isinstance(rubric, dict) else None
    return {
        "category": question.category,
        "question_type": question.question_type,
        "expected_concepts": list(question.expected_concepts or [])[:12],
        "scoring_keys": list(rubric.keys())[:12] if isinstance(rubric, dict) else [],
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
    return {
        "mode": "free_tier_batch_v1",
        "profile": {
            "candidate_id": profile.id,
            "target_role": profile.target_role,
            "experience_level": profile.experience_level,
            "tech_stack": profile.tech_stack or [],
            "skills": profile.skills or [],
            "project_summary": getattr(profile, "project_summary", None),
            "career_goal": getattr(profile, "career_goal", None),
            "has_portfolio_url": bool(profile.portfolio_url),
            "has_linkedin_url": bool(profile.linkedin_url),
            "has_resume_url": bool(profile.resume_url),
            "gpa": profile.gpa,
        },
        "session": {
            "session_id": session.id,
            "target_role": session.target_role,
            "experience_level": session.experience_level,
            "selected_difficulty": session.selected_difficulty,
            "total_questions": session.total_questions,
        },
        "integrity_summary": integrity_summary.model_dump(),
        "questions": [
            {
                "question": {
                    "assessment_question_id": answer.assessment_question_id,
                    "order_index": answer.order_index,
                    "question_text": answer.assessment_question.question_text,
                    "question_type": answer.assessment_question.question_type,
                    "category": answer.assessment_question.category,
                    "difficulty": answer.assessment_question.difficulty,
                    "expected_concepts": answer.assessment_question.expected_concepts or [],
                    "rubric_hint": compressed_question_rubric(answer),
                    "rubric_context": compact_rubrics_by_question.get(answer.assessment_question_id, []),
                },
                "answer": {
                    "answer_id": answer.id,
                    "answer_status": answer_status_for(answer),
                    "answer_text": answer.answer_text,
                    "code_text": answer.code_text,
                    "duration_seconds": answer.duration_seconds,
                    "latest_run_result": (answer.answer_metadata or {}).get("latest_run_result"),
                },
            }
            for answer in answers
        ],
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
    feedback_parts = [compact.feedback.strip(), compact.improvement_tip.strip()]
    feedback = " ".join(part for part in feedback_parts if part).strip()
    return AIAnswerEvaluation(
        technical_accuracy=score,
        problem_solving=score,
        communication_clarity=score,
        reasoning_depth=score,
        code_quality=score,
        expected_concepts_covered=compact.strengths,
        missing_concepts=compact.missing_concepts,
        confidence=80,
        short_feedback=feedback or "Assessment answer evaluated in batch mode.",
        transcript_evidence=compact.strengths[:2] or [compact.feedback or "Batch question evaluation."],
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
    integrity_summary = integrity_summary_for_session(db, session)
    compact_rubrics_by_question: dict[str, list[dict]] = {}
    rubric_contexts: list[AIRubricContext] = []
    for answer in answers:
        compact_rubrics, rubric_context = compact_rubric_context_for_answer(db, profile, answer, settings)
        compact_rubrics_by_question[answer.assessment_question_id] = compact_rubrics
        rubric_contexts.append(rubric_context)
    ai_provider = provider or build_ai_provider(provider_name)
    try:
        draft = ai_provider.evaluate_assessment_batch(
            build_batch_evaluation_payload(
                profile,
                session,
                answers,
                integrity_summary,
                compact_rubrics_by_question,
            )
        )
    except ProviderOutputError as exc:
        provider_metadata = ai_provider.state.metadata()
        rate_limited = (
            "rate_limited" in str(exc).lower()
            or provider_metadata.failure_reason.get("openrouter") == "rate_limited"
        )
        if settings.ai_required_for_evaluation and not settings.allow_stub_evaluation:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS if rate_limited else status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "code": "ai_provider_unavailable",
                    "message": "Real AI evaluation provider is unavailable. No verified report was created.",
                    "retryable": True,
                    "retry_after_seconds": getattr(settings, "ai_provider_failure_cooldown_seconds", 300) if rate_limited else None,
                    "provider_metadata": provider_metadata.model_dump(),
                },
            ) from exc
        raise
    provider_metadata = ai_provider.state.metadata()
    if (
        settings.ai_required_for_evaluation
        and not settings.allow_stub_evaluation
        and provider_metadata.actual_provider == "stub"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Real AI evaluation is required, but no real AI provider completed the batch evaluation.",
        )

    batch_evaluations = batch_answer_evaluations_by_question(draft)
    answer_evaluations: list[AIAnswerEvaluation] = []
    missing_batch_question_ids = [
        answer.assessment_question_id
        for answer in answers
        if answer.assessment_question_id not in batch_evaluations
    ]
    for answer in answers:
        original_status = answer_status_for(answer)
        compact_evaluation = batch_evaluations.get(answer.assessment_question_id)
        if original_status in {"skipped", "insufficient_response"}:
            status_label = original_status
            evaluation = insufficient_answer_evaluation(answer, status_label)
        elif compact_evaluation is None:
            status_label = "insufficient_response"
            evaluation = fallback_batch_evaluation(answer, status_label)
        else:
            status_label = compact_status_to_report_status(compact_evaluation.answer_status)
            evaluation = compact_question_to_answer_evaluation(compact_evaluation)
        rubric_context = rubric_contexts[len(answer_evaluations)]
        answer.ai_evaluation = {
            **evaluation.model_dump(),
            **rubric_metadata_for_answer(rubric_context),
            "answer_status": status_label,
            "skill_area": compact_evaluation.skill_area if compact_evaluation is not None else answer.assessment_question.category,
            "batch_missing_question_evaluation": compact_evaluation is None,
        }
        answer_evaluations.append(evaluation)
        rubric_contexts.append(rubric_context)

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
    report_json = {
        "evaluation_mode": "batch",
        "free_tier_mode": settings.ai_free_tier_mode,
        "ai_call_budget": settings.evaluation_max_ai_calls_per_report,
        "provider_metadata": provider_metadata.model_dump(),
        "batch_response_schema": "compact_v1",
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
        "question_wise_scores": question_wise_scores(answers, answer_evaluations),
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
            return raced_report
        raise
    db.refresh(report)
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
        answer.ai_evaluation = {
            **evaluation.model_dump(),
            **rubric_metadata_for_answer(rubric_context),
            "answer_status": status_label,
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
        "question_wise_scores": question_wise_scores(answers, answer_evaluations),
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

    if getattr(settings, "report_generation_lock_enabled", False):
        lock = report_generation_lock(session.id)
        with lock:
            existing = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
            if existing is not None and not force_regenerate:
                return existing
            return _generate_evaluation_report_unlocked(
                db,
                session,
                existing,
                settings,
                provider=provider,
                provider_name=provider_name,
            )

    existing = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
    if existing is not None and not force_regenerate:
        return existing
    return _generate_evaluation_report_unlocked(
        db,
        session,
        existing,
        settings,
        provider=provider,
        provider_name=provider_name,
    )


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
