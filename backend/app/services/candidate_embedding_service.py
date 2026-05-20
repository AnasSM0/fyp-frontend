from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.models.semantic import CandidateEmbedding
from app.models.user import User
from app.schemas.semantic import (
    CandidateEmbeddingRead,
    CandidateEmbeddingRebuildResponse,
    CandidateEmbeddingStatus,
)
from app.services.embedding_provider import FallbackEmbeddingProvider, build_embedding_provider


def latest_published_report(db: Session, profile: CandidateProfile) -> EvaluationReport | None:
    return db.scalar(
        select(EvaluationReport)
        .where(EvaluationReport.candidate_id == profile.id, EvaluationReport.published.is_(True))
        .order_by(desc(EvaluationReport.updated_at), desc(EvaluationReport.created_at))
    )


def latest_embedding(db: Session, profile: CandidateProfile) -> CandidateEmbedding | None:
    return db.scalar(
        select(CandidateEmbedding)
        .where(CandidateEmbedding.candidate_id == profile.id)
        .order_by(desc(CandidateEmbedding.updated_at), desc(CandidateEmbedding.created_at))
    )


def candidate_profile_for_user(db: Session, user: User) -> CandidateProfile | None:
    return db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))


def embedding_read(embedding: CandidateEmbedding) -> CandidateEmbeddingRead:
    return CandidateEmbeddingRead.model_validate(embedding)


def embedding_status_for_user(db: Session, user: User) -> CandidateEmbeddingStatus:
    profile = candidate_profile_for_user(db, user)
    if profile is None:
        return CandidateEmbeddingStatus(
            profile_exists=False,
            profile_visible=False,
            latest_published_report_id=None,
            has_embedding=False,
        )
    report = latest_published_report(db, profile)
    embedding = latest_embedding(db, profile)
    return CandidateEmbeddingStatus(
        profile_exists=True,
        profile_visible=profile.profile_visibility,
        latest_published_report_id=report.id if report else None,
        has_embedding=embedding is not None,
        embedding=embedding_read(embedding) if embedding else None,
    )


def best_role_fit(report: EvaluationReport) -> float:
    role_fit = (report.report_json or {}).get("role_fit") or []
    scores: list[float] = []
    for item in role_fit:
        if isinstance(item, dict):
            try:
                scores.append(float(item.get("score", 0)))
            except (TypeError, ValueError):
                pass
    return max(scores) if scores else float(report.ai_test_score)


def build_embedding_text(profile: CandidateProfile, report: EvaluationReport) -> str:
    report_json = report.report_json or {}
    strengths = report_json.get("strengths") or []
    weaknesses = report_json.get("weaknesses") or []
    role_fit = report_json.get("role_fit") or []
    integrity = report_json.get("integrity_summary") or {}
    project_quality = report_json.get("project_quality") or {}
    parts = [
        f"Candidate: {profile.full_name or 'Unnamed candidate'}",
        f"Target role: {profile.target_role or 'unspecified'}",
        f"Experience level: {profile.experience_level or 'unspecified'}",
        f"Skills: {', '.join(profile.skills or [])}",
        f"Tech stack: {', '.join(profile.tech_stack or [])}",
        f"Education: {profile.degree or ''} {profile.university or ''} graduation {profile.graduation_year or ''}",
        f"GPA: {profile.gpa if profile.gpa is not None else 'not provided'}",
        f"Availability: {profile.availability_status}",
        f"Verified score: {report.verified_score}",
        f"AI test score: {report.ai_test_score}",
        f"Project quality score: {report.project_quality_score}",
        f"Communication score: {report.communication_score}",
        f"Integrity score: {report.integrity_score}",
        f"Integrity risk: {integrity.get('risk_level', 'clean')}",
        f"Project quality summary: {project_quality.get('summary', '')}",
        f"Strengths: {'; '.join(strengths)}",
        f"Weaknesses: {'; '.join(weaknesses)}",
        f"Role fit: {role_fit}",
        f"Recruiter summary: {report.recruiter_summary}",
    ]
    return "\n".join(parts)


def discoverable_report_for_profile(db: Session, profile: CandidateProfile) -> EvaluationReport:
    if not profile.profile_visibility:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate profile must be visible before rebuilding embedding",
        )
    report = latest_published_report(db, profile)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Candidate needs a published evaluation report before embedding rebuild",
        )
    return report


def rebuild_candidate_embedding(
    db: Session,
    profile: CandidateProfile,
    report: EvaluationReport | None = None,
    provider: FallbackEmbeddingProvider | None = None,
    commit: bool = True,
) -> tuple[CandidateEmbedding, object]:
    report = report or discoverable_report_for_profile(db, profile)
    if not report.published or not profile.profile_visibility:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only published and visible candidates can be embedded",
        )
    embedding_text = build_embedding_text(profile, report)
    ai_provider = provider or build_embedding_provider()
    result = ai_provider.embed_text(embedding_text)
    embedding = db.scalar(
        select(CandidateEmbedding).where(
            CandidateEmbedding.candidate_id == profile.id,
            CandidateEmbedding.report_id == report.id,
            CandidateEmbedding.source_type == "published_report",
        )
    )
    if embedding is None:
        embedding = CandidateEmbedding(
            candidate_id=profile.id,
            report_id=report.id,
            source_type="published_report",
        )
        db.add(embedding)
    embedding.embedding_text = embedding_text
    embedding.embedding = result.vector
    embedding.embedding_json = result.vector
    embedding.embedding_model = result.model
    embedding.embedding_provider = result.provider
    embedding.embedding_dimensions = result.dimensions
    embedding.fallback_used = result.fallback_used
    embedding.metadata_json = {
        "verified_score": report.verified_score,
        "role_fit": best_role_fit(report),
        "integrity_risk_level": (report.report_json or {})
        .get("integrity_summary", {})
        .get("risk_level", "clean"),
        "provider_warnings": result.warnings,
    }
    if commit:
        db.commit()
        db.refresh(embedding)
    else:
        db.flush()
    return embedding, result.metadata()


def rebuild_own_embedding(db: Session, user: User) -> CandidateEmbeddingRebuildResponse:
    profile = candidate_profile_for_user(db, user)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    report = discoverable_report_for_profile(db, profile)
    embedding, metadata = rebuild_candidate_embedding(db, profile, report=report)
    return CandidateEmbeddingRebuildResponse(
        embedding=embedding_read(embedding),
        provider_metadata=metadata,
    )


def rebuild_candidate_embedding_for_recruiter(
    db: Session, candidate_id: str
) -> CandidateEmbeddingRebuildResponse:
    profile = db.get(CandidateProfile, candidate_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    report = discoverable_report_for_profile(db, profile)
    embedding, metadata = rebuild_candidate_embedding(db, profile, report=report)
    return CandidateEmbeddingRebuildResponse(
        embedding=embedding_read(embedding),
        provider_metadata=metadata,
    )
