from __future__ import annotations

import math
import re
from collections import OrderedDict

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.evaluation import EvaluationReport
from app.models.profile import CandidateProfile
from app.models.semantic import CandidateEmbedding, RecruiterSearch
from app.models.user import User
from app.schemas.semantic import (
    CandidateSearchProfileSummary,
    CandidateSearchRequest,
    CandidateSearchResponse,
    CandidateSearchResult,
    RecruiterSearchRead,
)
from app.services.candidate_embedding_service import best_role_fit
from app.services.embedding_provider import EmbeddingResult, build_embedding_provider


TOKEN_RE = re.compile(r"[a-zA-Z0-9+#.]+")


def clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))


def tokens(text: str) -> set[str]:
    return {item.lower() for item in TOKEN_RE.findall(text or "")}


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left or not right:
        return 0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0
    return dot / (left_norm * right_norm)


def semantic_score(query_vector: list[float], candidate_vector: list[float]) -> float:
    return round(clamp((cosine_similarity(query_vector, candidate_vector) + 1) * 50), 2)


def text_similarity_score(query: str, embedding_text: str) -> float:
    query_tokens = tokens(query)
    text_tokens = tokens(embedding_text)
    if not query_tokens or not text_tokens:
        return 0
    overlap = len(query_tokens & text_tokens)
    score = (overlap / max(1, len(query_tokens))) * 100
    return round(clamp(score), 2)


def availability_score(status: str) -> float:
    normalized = (status or "").lower()
    if normalized == "open":
        return 100
    if normalized in {"interviewing", "limited", "open_to_offers"}:
        return 60
    return 20


def integrity_penalty(risk_level: str) -> float:
    return {"clean": 0, "low": 2, "moderate": 6, "high": 12}.get(
        (risk_level or "clean").lower(),
        0,
    )


def final_match_score(
    semantic: float,
    verified_score: float,
    role_fit: float,
    availability: float,
    risk_level: str,
) -> float:
    score = (
        0.55 * semantic
        + 0.30 * verified_score
        + 0.10 * role_fit
        + 0.05 * availability
        - integrity_penalty(risk_level)
    )
    return round(clamp(score), 2)


def candidate_terms(profile: CandidateProfile) -> OrderedDict[str, str]:
    terms: OrderedDict[str, str] = OrderedDict()
    for value in [*(profile.skills or []), *(profile.tech_stack or [])]:
        terms[value.lower()] = value
    return terms


def matched_and_missing_skills(
    query: str, profile: CandidateProfile, requested_skills: list[str]
) -> tuple[list[str], list[str]]:
    query_lower = query.lower()
    terms = candidate_terms(profile)
    matched = [
        display
        for lower, display in terms.items()
        if lower in query_lower or any(part in query_lower for part in lower.split())
    ]
    if not matched:
        matched = list(terms.values())[:3]
    missing = [skill for skill in requested_skills if skill.lower() not in terms]
    return matched[:8], missing[:8]


def integrity_risk(report: EvaluationReport) -> str:
    return (report.report_json or {}).get("integrity_summary", {}).get("risk_level", "clean")


def candidate_passes_filters(
    embedding: CandidateEmbedding,
    request: CandidateSearchRequest,
) -> bool:
    profile = embedding.candidate
    report = embedding.report
    filters = request.filters
    if profile is None or report is None:
        return False
    if not profile.profile_visibility or not report.published:
        return False
    if filters.minimum_verified_score is not None and report.verified_score < filters.minimum_verified_score:
        return False
    if filters.availability_status and profile.availability_status != filters.availability_status:
        return False
    if filters.experience_level and (profile.experience_level or "").lower() != filters.experience_level.lower():
        return False
    if filters.university and filters.university.lower() not in (profile.university or "").lower():
        return False
    if filters.role and filters.role.lower() not in (profile.target_role or "").lower():
        return False
    if filters.integrity_risk_level and integrity_risk(report) != filters.integrity_risk_level:
        return False
    if filters.skills:
        terms = candidate_terms(profile)
        if not any(skill.lower() in terms for skill in filters.skills):
            return False
    return True


def newest_embeddings(db: Session) -> list[CandidateEmbedding]:
    rows = db.scalars(
        select(CandidateEmbedding)
        .join(CandidateProfile, CandidateEmbedding.candidate_id == CandidateProfile.id)
        .join(EvaluationReport, CandidateEmbedding.report_id == EvaluationReport.id)
        .where(CandidateProfile.profile_visibility.is_(True), EvaluationReport.published.is_(True))
        .order_by(CandidateEmbedding.candidate_id, desc(CandidateEmbedding.updated_at))
    ).all()
    by_candidate: OrderedDict[str, CandidateEmbedding] = OrderedDict()
    for row in rows:
        if row.candidate_id not in by_candidate:
            by_candidate[row.candidate_id] = row
    return list(by_candidate.values())


def result_for_embedding(
    embedding: CandidateEmbedding,
    request: CandidateSearchRequest,
    semantic: float,
    provider,
    fallback_mode: bool,
) -> CandidateSearchResult:
    profile = embedding.candidate
    report = embedding.report
    assert profile is not None
    assert report is not None
    role_score = best_role_fit(report)
    risk_level = integrity_risk(report)
    matched, missing = matched_and_missing_skills(request.query, profile, request.filters.skills)
    payload = {
        "query": request.query,
        "candidate": profile.full_name,
        "target_role": profile.target_role,
        "matched_skills": matched,
        "missing_skills": missing,
        "verified_score": round(report.verified_score, 2),
        "role_fit": round(role_score, 2),
        "integrity_risk_level": risk_level,
    }
    explanation, explanation_fallback, _ = provider.explain_match(payload)
    final_score = final_match_score(
        semantic,
        report.verified_score,
        role_score,
        availability_score(profile.availability_status),
        risk_level,
    )
    return CandidateSearchResult(
        candidate_id=profile.id,
        report_id=report.id,
        profile=CandidateSearchProfileSummary(
            id=profile.id,
            full_name=profile.full_name,
            university=profile.university,
            degree=profile.degree,
            graduation_year=profile.graduation_year,
            target_role=profile.target_role,
            experience_level=profile.experience_level,
            tech_stack=profile.tech_stack,
            skills=profile.skills,
            availability_status=profile.availability_status,
        ),
        verified_score=round(report.verified_score, 2),
        semantic_match_score=semantic,
        final_match_score=final_score,
        matched_skills=matched,
        missing_skills=missing,
        role_fit=round(role_score, 2),
        integrity_risk_level=risk_level,
        recruiter_summary=report.recruiter_summary,
        match_explanation=explanation,
        fallback_mode_used=fallback_mode or explanation_fallback,
    )


def search_candidates(db: Session, user: User, request: CandidateSearchRequest) -> CandidateSearchResponse:
    provider = build_embedding_provider()
    query_embedding = provider.embed_text(request.query)
    candidates = [row for row in newest_embeddings(db) if candidate_passes_filters(row, request)]
    results: list[CandidateSearchResult] = []
    fallback_mode = query_embedding.fallback_used
    for embedding in candidates:
        vector = embedding.embedding_json or embedding.embedding
        if vector and embedding.embedding_dimensions == query_embedding.dimensions:
            score = semantic_score(query_embedding.vector, vector)
            results.append(result_for_embedding(embedding, request, score, provider, fallback_mode))
        elif get_settings().enable_search_text_fallback and embedding.embedding_text:
            fallback_mode = True
            score = text_similarity_score(request.query, embedding.embedding_text)
            results.append(result_for_embedding(embedding, request, score, provider, True))

    results.sort(key=lambda item: item.final_match_score, reverse=True)
    results = results[: request.limit]
    search_row = RecruiterSearch(
        recruiter_id=user.id,
        query=request.query,
        filters_json=request.filters.model_dump(),
        result_count=len(results),
        fallback_mode_used=fallback_mode,
        provider=query_embedding.provider,
        model=query_embedding.model,
    )
    db.add(search_row)
    db.commit()
    return CandidateSearchResponse(
        query=request.query,
        filters=request.filters,
        result_count=len(results),
        fallback_mode_used=fallback_mode,
        provider_metadata=query_embedding.metadata(),
        results=results,
    )


def search_history_for_recruiter(db: Session, user: User) -> list[RecruiterSearchRead]:
    rows = db.scalars(
        select(RecruiterSearch)
        .where(RecruiterSearch.recruiter_id == user.id)
        .order_by(desc(RecruiterSearch.created_at))
        .limit(25)
    ).all()
    return [RecruiterSearchRead.model_validate(row) for row in rows]
