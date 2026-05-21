from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.rag import RagDocument
from app.schemas.rag import RAGDatasetRecord
from app.services.embedding_provider import FallbackEmbeddingProvider, GeminiEmbeddingProvider
from app.services.rag_dataset import RAGDatasetLoadError, load_rag_dataset_dir, load_rag_dataset_file


@dataclass
class RagImportSummary:
    total_records: int = 0
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    deactivated: int = 0
    embeddings_generated: int = 0
    embeddings_skipped: int = 0
    fallback_embeddings: int = 0
    counts_by_source_type: dict[str, int] = field(default_factory=dict)
    counts_by_role: dict[str, int] = field(default_factory=dict)
    counts_by_difficulty: dict[str, int] = field(default_factory=dict)
    counts_by_embedding_provider: dict[str, int] = field(default_factory=dict)


def resolve_dataset_path(value: str | Path) -> Path:
    raw = Path(value)
    backend_root = Path(__file__).resolve().parents[2]
    candidates = [
        raw,
        Path.cwd() / raw,
        backend_root / raw,
        backend_root.parent / raw,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return raw


def load_rag_records(path: str | Path) -> list[RAGDatasetRecord]:
    resolved = resolve_dataset_path(path)
    if resolved.is_file():
        return load_rag_dataset_file(resolved).records
    if resolved.is_dir():
        return load_rag_dataset_dir(resolved)
    raise RAGDatasetLoadError(f"RAG dataset path does not exist: {path}")


def rag_record_raw_json(record: RAGDatasetRecord) -> dict:
    return record.model_dump(mode="json")


def rag_content_hash(record: RAGDatasetRecord) -> str:
    payload = json.dumps(rag_record_raw_json(record), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _assign_record(document: RagDocument, record: RAGDatasetRecord, content_hash: str) -> None:
    document.source_type = record.source_type
    document.title = record.title
    document.content = record.content or record.question_text or record.task_description
    document.role = record.role
    document.specialization = record.specialization
    document.difficulty = record.difficulty
    document.experience_level = record.experience_level
    document.category = record.category
    document.question_type = record.question_type
    document.tech_stack = record.tech_stack
    document.tags = record.tags
    document.expected_concepts = record.expected_concepts
    document.scoring_rubric = record.scoring_rubric
    document.sample_followups = record.sample_followups
    document.metadata_json = record.metadata
    document.raw_json = rag_record_raw_json(record)
    document.embedding_text = record.embedding_text or ""
    document.content_hash = content_hash
    document.is_active = True


def _assign_embedding(document: RagDocument, provider: FallbackEmbeddingProvider) -> bool:
    result = provider.embed_text(document.embedding_text)
    document.embedding = result.vector
    document.embedding_json = result.vector
    document.embedding_provider = result.provider
    document.embedding_model = result.model
    document.embedding_dimensions = result.dimensions
    document.fallback_used = result.fallback_used
    return result.fallback_used


def _clear_embedding(document: RagDocument) -> None:
    document.embedding = None
    document.embedding_json = []
    document.embedding_provider = None
    document.embedding_model = None
    document.embedding_dimensions = None
    document.fallback_used = False


def build_rag_embedding_provider() -> FallbackEmbeddingProvider:
    settings = get_settings()
    provider_name = settings.rag_embedding_provider.strip().lower()
    primary = None
    if provider_name == "gemini" and settings.gemini_api_key:
        primary = GeminiEmbeddingProvider(
            api_key=settings.gemini_api_key,
            model=settings.rag_embedding_model,
        )
    return FallbackEmbeddingProvider(primary, settings.stub_embedding_dimensions)


def import_rag_documents(
    db: Session,
    dataset_path: str | Path,
    *,
    deactivate_missing: bool = False,
    generate_embeddings: bool = True,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagImportSummary:
    records = load_rag_records(dataset_path)
    seen_ids = {record.id for record in records}
    summary = RagImportSummary(total_records=len(records))
    embedding_provider = provider or build_rag_embedding_provider()

    try:
        for record in records:
            content_hash = rag_content_hash(record)
            document = db.get(RagDocument, record.id)
            if document is None:
                document = RagDocument(id=record.id)
                db.add(document)
                summary.inserted += 1
                changed = True
            else:
                changed = document.content_hash != content_hash or not document.is_active
                if changed:
                    summary.updated += 1
                else:
                    summary.unchanged += 1

            if changed:
                _assign_record(document, record, content_hash)
                if not generate_embeddings:
                    _clear_embedding(document)

            needs_embedding = (
                generate_embeddings
                and (changed or document.embedding_dimensions is None or not document.embedding_json)
            )
            if needs_embedding:
                if _assign_embedding(document, embedding_provider):
                    summary.fallback_embeddings += 1
                summary.embeddings_generated += 1
            elif not generate_embeddings:
                summary.embeddings_skipped += 1

        if deactivate_missing:
            existing = db.scalars(select(RagDocument).where(RagDocument.id.not_in(seen_ids))).all()
            for document in existing:
                if document.is_active:
                    document.is_active = False
                    summary.deactivated += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return summarize_rag_documents(db, base=summary)


def rebuild_rag_embeddings(
    db: Session,
    *,
    source_type: str | None = None,
    provider: FallbackEmbeddingProvider | None = None,
) -> RagImportSummary:
    query = select(RagDocument).where(RagDocument.is_active.is_(True))
    if source_type:
        query = query.where(RagDocument.source_type == source_type)
    documents = db.scalars(query).all()
    embedding_provider = provider or build_rag_embedding_provider()
    summary = RagImportSummary(total_records=len(documents))
    try:
        for document in documents:
            if _assign_embedding(document, embedding_provider):
                summary.fallback_embeddings += 1
            summary.embeddings_generated += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return summarize_rag_documents(db, base=summary)


def validate_rag_dataset_path(dataset_path: str | Path) -> RagImportSummary:
    records = load_rag_records(dataset_path)
    summary = RagImportSummary(total_records=len(records))
    for record in records:
        summary.counts_by_source_type[record.source_type] = (
            summary.counts_by_source_type.get(record.source_type, 0) + 1
        )
        summary.counts_by_role[record.role] = summary.counts_by_role.get(record.role, 0) + 1
        summary.counts_by_difficulty[record.difficulty] = (
            summary.counts_by_difficulty.get(record.difficulty, 0) + 1
        )
    return summary


def summarize_rag_documents(db: Session, base: RagImportSummary | None = None) -> RagImportSummary:
    summary = base or RagImportSummary()
    summary.counts_by_source_type = dict(
        db.execute(
            select(RagDocument.source_type, func.count()).where(RagDocument.is_active.is_(True)).group_by(
                RagDocument.source_type
            )
        ).all()
    )
    summary.counts_by_role = dict(
        db.execute(
            select(RagDocument.role, func.count()).where(RagDocument.is_active.is_(True)).group_by(RagDocument.role)
        ).all()
    )
    summary.counts_by_difficulty = dict(
        db.execute(
            select(RagDocument.difficulty, func.count())
            .where(RagDocument.is_active.is_(True))
            .group_by(RagDocument.difficulty)
        ).all()
    )
    summary.counts_by_embedding_provider = dict(
        db.execute(
            select(RagDocument.embedding_provider, func.count())
            .where(RagDocument.is_active.is_(True), RagDocument.embedding_provider.is_not(None))
            .group_by(RagDocument.embedding_provider)
        ).all()
    )
    return summary
