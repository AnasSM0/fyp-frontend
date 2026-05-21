from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rag import RagDocument
from app.schemas.rag import (
    RagRetrievalRequest,
    RagRetrievalResponse,
    RagRetrievalResult,
    RagScoreBreakdown,
)
from app.services.embedding_provider import FallbackEmbeddingProvider, StubEmbeddingProvider
from app.services.rag_ingestion_service import build_rag_embedding_provider

TOKEN_RE = re.compile(r"[a-zA-Z0-9+#.]+")

ROLE_FAMILIES = {
    "frontend": {"frontend", "front-end", "react", "next.js", "ui", "typescript"},
    "backend": {"backend", "back-end", "api", "fastapi", "python", "server"},
    "full_stack": {"full stack", "full-stack", "frontend", "backend", "react", "fastapi", "api"},
    "ai_ml": {"ai", "ml", "machine learning", "llm", "model", "embedding"},
    "database": {"database", "postgresql", "sql", "schema", "query"},
    "general": {"communication", "onboarding", "career", "system design", "debugging"},
}

ASSESSMENT_CATEGORY_PRIORITY = [
    ("frontend", {"frontend", "react", "next"}),
    ("backend", {"backend", "api", "fastapi"}),
    ("database", {"database", "postgres", "sql"}),
    ("fullstack", {"full-stack", "fullstack", "integration", "architecture"}),
    ("debugging", {"debugging", "scenario"}),
    ("communication", {"communication", "system-design", "system design"}),
]


@dataclass
class _CandidateScore:
    document: RagDocument
    vector_score: float
    tech_stack_score: float
    role_score: float
    difficulty_score: float
    diversity_score: float
    final_score: float
    fallback_used: bool
    matched_stack_terms: list[str]
    matched_role_family: str | None
    similarity_reason: str


def clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def tokenize(text: str | None) -> set[str]:
    if not text:
        return set()
    return {token.lower() for token in TOKEN_RE.findall(text)}


def phrase_tokens(values: Iterable[str]) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        normalized = value.strip().lower()
        if normalized:
            tokens.add(normalized)
        tokens.update(tokenize(value))
    return tokens


def role_family(value: str | None) -> str:
    tokens = phrase_tokens([value or ""])
    lowered = (value or "").lower()
    for family, markers in ROLE_FAMILIES.items():
        if any(marker in lowered or marker in tokens for marker in markers):
            return family
    return "general"


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0
    return numerator / (left_norm * right_norm)


def vector_similarity_score(query_vector: list[float], document: RagDocument) -> tuple[float, bool, str]:
    document_vector = document.embedding_json or document.embedding or []
    if (
        not query_vector
        or not document_vector
        or document.embedding_dimensions != len(query_vector)
        or len(document_vector) != len(query_vector)
    ):
        return 0, True, "text fallback used because vector embedding is missing or dimension mismatched"
    cosine = cosine_similarity(query_vector, [float(value) for value in document_vector])
    return clamp_score(((cosine + 1) / 2) * 100), False, "vector similarity used with matching dimensions"


def text_similarity_score(query_text: str, document: RagDocument) -> float:
    query_tokens = tokenize(query_text)
    document_tokens = tokenize(document.embedding_text)
    if not query_tokens or not document_tokens:
        return 0
    intersection = len(query_tokens & document_tokens)
    return clamp_score((2 * intersection / (len(query_tokens) + len(document_tokens))) * 100)


def stack_score(request: RagRetrievalRequest, document: RagDocument) -> tuple[float, list[str]]:
    requested = phrase_tokens([*request.tech_stack, *request.skills])
    if not requested:
        return 50, []
    document_terms = phrase_tokens([*document.tech_stack, *document.tags, document.category, document.title])
    matched = sorted(requested & document_terms)
    score = (len(matched) / max(1, len(requested))) * 100
    if any(term in {"full-stack", "full", "stack"} for term in document_terms) and request.target_role:
        score = max(score, 40)
    return clamp_score(score), matched


def role_score(request: RagRetrievalRequest, document: RagDocument) -> tuple[float, str | None]:
    if not request.target_role:
        return 50, None
    requested_family = role_family(request.target_role)
    document_family = role_family(document.role)
    if request.target_role.lower() == document.role.lower():
        return 100, requested_family
    if requested_family == document_family:
        return 85, requested_family
    if requested_family == "full_stack" and document_family in {"frontend", "backend", "database", "general"}:
        return 70, requested_family
    if document_family == "general":
        return 55, requested_family
    return 15, requested_family


def difficulty_score(request: RagRetrievalRequest, document: RagDocument) -> float:
    score = 50.0
    difficulty_order = {"beginner": 1, "intermediate": 2, "advanced": 3}
    if request.difficulty:
        if request.difficulty == document.difficulty:
            score = 100
        else:
            distance = abs(difficulty_order[request.difficulty] - difficulty_order.get(document.difficulty, 2))
            score = 70 if distance == 1 else 35
    if request.experience_level:
        requested = request.experience_level.lower()
        document_level = document.experience_level.lower()
        if requested == document_level or requested in document_level or document_level in requested:
            score = max(score, 90)
        elif "student" in requested and "student" in document_level:
            score = max(score, 85)
    return clamp_score(score)


def diversity_score(document: RagDocument, category_counts: dict[str, int]) -> float:
    count = category_counts.get(document.category, 0)
    if count == 0:
        return 100
    if count == 1:
        return 60
    return 20


def final_score(
    vector_score_value: float,
    tech_stack_score: float,
    role_score_value: float,
    difficulty_score_value: float,
    diversity_score_value: float,
) -> float:
    return clamp_score(
        0.50 * vector_score_value
        + 0.20 * tech_stack_score
        + 0.15 * role_score_value
        + 0.10 * difficulty_score_value
        + 0.05 * diversity_score_value
    )


def build_candidate_retrieval_query(
    *,
    target_role: str | None = None,
    tech_stack: list[str] | None = None,
    skills: list[str] | None = None,
    project_summary: str | None = None,
    career_goal: str | None = None,
) -> str:
    parts = [
        f"Target role: {target_role or 'unspecified'}",
        f"Tech stack: {', '.join(tech_stack or [])}",
        f"Skills: {', '.join(skills or [])}",
        f"Project summary: {project_summary or ''}",
        f"Career goal: {career_goal or ''}",
    ]
    return "\n".join(parts)


def filtered_documents(db: Session, request: RagRetrievalRequest) -> list[RagDocument]:
    query = select(RagDocument).where(RagDocument.is_active.is_(True))
    if request.source_types:
        query = query.where(RagDocument.source_type.in_(request.source_types))
    if request.categories:
        query = query.where(RagDocument.category.in_(request.categories))
    if request.question_types:
        query = query.where(RagDocument.question_type.in_(request.question_types))
    return list(db.scalars(query).all())


def score_document(
    request: RagRetrievalRequest,
    document: RagDocument,
    query_vector: list[float],
    category_counts: dict[str, int],
) -> _CandidateScore:
    vector_score_value, vector_fallback, similarity_reason = vector_similarity_score(query_vector, document)
    fallback_used = vector_fallback
    if vector_fallback:
        vector_score_value = text_similarity_score(request.query_text, document)
    tech_score, matched_stack_terms = stack_score(request, document)
    role_score_value, matched_family = role_score(request, document)
    difficulty_score_value = difficulty_score(request, document)
    diversity_score_value = diversity_score(document, category_counts)
    return _CandidateScore(
        document=document,
        vector_score=vector_score_value,
        tech_stack_score=tech_score,
        role_score=role_score_value,
        difficulty_score=difficulty_score_value,
        diversity_score=diversity_score_value,
        final_score=final_score(
            vector_score_value,
            tech_score,
            role_score_value,
            difficulty_score_value,
            diversity_score_value,
        ),
        fallback_used=fallback_used,
        matched_stack_terms=matched_stack_terms,
        matched_role_family=matched_family,
        similarity_reason=similarity_reason,
    )


def why_matched(score: _CandidateScore) -> str:
    document = score.document
    stack_terms = ", ".join(score.matched_stack_terms) if score.matched_stack_terms else "no exact stack term"
    role = score.matched_role_family or role_family(document.role)
    return (
        f"Matched role family: {role}. "
        f"Matched tech stack terms: {stack_terms}. "
        f"Matched category/type: {document.category}/{document.question_type}. "
        f"Similarity: {score.similarity_reason} ({score.vector_score}/100). "
        f"Difficulty/experience compatibility: {score.difficulty_score}/100."
    )


def result_from_score(score: _CandidateScore, debug: bool) -> RagRetrievalResult:
    document = score.document
    summary = document.content
    if summary and len(summary) > 360:
        summary = summary[:357].rstrip() + "..."
    return RagRetrievalResult(
        document_id=document.id,
        source_type=document.source_type,
        title=document.title,
        role=document.role,
        tech_stack=document.tech_stack,
        difficulty=document.difficulty,
        experience_level=document.experience_level,
        category=document.category,
        question_type=document.question_type,
        summary=summary,
        score=RagScoreBreakdown(
            final_score=score.final_score,
            vector_score=score.vector_score,
            tech_stack_score=score.tech_stack_score,
            role_score=score.role_score,
            difficulty_score=score.difficulty_score,
            diversity_score=score.diversity_score,
        ),
        fallback_used=score.fallback_used,
        metadata=document.metadata_json,
        why_matched=why_matched(score) if debug else None,
    )


def rerank_rag_results(scores: list[_CandidateScore], top_k: int, diversity_enabled: bool) -> list[_CandidateScore]:
    ranked = sorted(scores, key=lambda item: item.final_score, reverse=True)
    if not diversity_enabled:
        return ranked[:top_k]

    selected: list[_CandidateScore] = []
    category_counts: dict[str, int] = {}
    for item in ranked:
        if category_counts.get(item.document.category, 0) >= 2:
            continue
        selected.append(item)
        category_counts[item.document.category] = category_counts.get(item.document.category, 0) + 1
        if len(selected) == top_k:
            return selected

    for item in ranked:
        if item not in selected:
            selected.append(item)
        if len(selected) == top_k:
            break
    return selected


def retrieve_rag_documents(
    db: Session,
    request: RagRetrievalRequest,
    *,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagRetrievalResponse:
    embedding_provider = provider or build_rag_embedding_provider()
    query_embedding = embedding_provider.embed_text(request.query_text)
    documents = filtered_documents(db, request)
    category_counts: dict[str, int] = {}
    scored: list[_CandidateScore] = []
    for document in documents:
        score = score_document(request, document, query_embedding.vector, category_counts)
        if score.vector_score >= request.min_similarity:
            scored.append(score)
            category_counts[document.category] = category_counts.get(document.category, 0) + 1

    ranked = rerank_rag_results(scored, request.top_k, request.diversity_enabled)
    fallback_used = query_embedding.fallback_used or any(item.fallback_used for item in ranked)
    return RagRetrievalResponse(
        query_text=request.query_text,
        result_count=len(ranked),
        fallback_used=fallback_used,
        provider_metadata=query_embedding.metadata(),
        results=[result_from_score(score, request.debug) for score in ranked],
    )


def retrieve_for_assessment(
    db: Session,
    *,
    target_role: str | None,
    tech_stack: list[str],
    skills: list[str],
    experience_level: str | None = None,
    difficulty: str | None = "intermediate",
    limit: int = 8,
    min_similarity: float = 0,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagRetrievalResponse:
    query_text = build_candidate_retrieval_query(
        target_role=target_role,
        tech_stack=tech_stack,
        skills=skills,
    )
    request = RagRetrievalRequest(
        query_text=query_text,
        source_types=["question", "coding_task"],
        target_role=target_role,
        tech_stack=tech_stack,
        skills=skills,
        experience_level=experience_level,
        difficulty=difficulty,
        top_k=limit,
        min_similarity=min_similarity,
        debug=True,
    )
    return retrieve_rag_documents(db, request, provider=provider)


def retrieve_for_onboarding(
    db: Session,
    *,
    current_profile: dict,
    user_message: str,
    limit: int = 5,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagRetrievalResponse:
    request = RagRetrievalRequest(
        query_text=user_message,
        source_types=["onboarding_prompt", "role_discovery_question"],
        target_role=current_profile.get("target_role"),
        tech_stack=current_profile.get("tech_stack") or [],
        skills=current_profile.get("skills") or [],
        experience_level=current_profile.get("experience_level"),
        top_k=limit,
    )
    return retrieve_rag_documents(db, request, provider=provider)


def retrieve_rubrics(
    db: Session,
    *,
    query_text: str,
    target_role: str | None = None,
    tech_stack: list[str] | None = None,
    categories: list[str] | None = None,
    limit: int = 5,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagRetrievalResponse:
    request = RagRetrievalRequest(
        query_text=query_text,
        source_types=["rubric"],
        target_role=target_role,
        tech_stack=tech_stack or [],
        categories=categories or [],
        top_k=limit,
        debug=True,
    )
    return retrieve_rag_documents(db, request, provider=provider)
