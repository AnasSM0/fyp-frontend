from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.models.user import User
from app.schemas.evaluation import (
    AIAnswerEvaluation,
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
            "category": answer.assessment_question.category,
            "difficulty": answer.assessment_question.difficulty,
            "evaluation": evaluation.model_dump(),
        }
        for answer, evaluation in zip(answers, evaluations)
    ]


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
    answers = sorted(session.answers, key=lambda item: item.order_index)
    answer_evaluations: list[AIAnswerEvaluation] = []
    for answer in answers:
        evaluation = ai_provider.evaluate_answer(profile, answer)
        answer.ai_evaluation = evaluation.model_dump()
        answer_evaluations.append(evaluation)

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

    db.commit()
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
