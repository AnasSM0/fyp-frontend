from types import SimpleNamespace

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
    CoachReportRequest,
    CoachReportResponse,
    AIRubricContext,
    AIRubricContextItem,
    EvaluationReportDetail,
)
from app.services.assessment_service import session_for_user
from app.services.ai_provider import FallbackAIProvider
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


def generate_evaluation_report(
    db: Session,
    session: AssessmentSession,
    force_regenerate: bool = False,
    provider: FallbackAIProvider | None = None,
    provider_name: str | None = None,
) -> EvaluationReport:
    ensure_session_ready(session)
    existing = db.scalar(select(EvaluationReport).where(EvaluationReport.session_id == session.id))
    if existing is not None and not force_regenerate:
        return existing

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
