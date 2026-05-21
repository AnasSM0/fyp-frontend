from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from pydantic import ValidationError

from app.schemas.rag import RAGDataset, RAGDatasetRecord, generate_rag_embedding_text


class RAGDatasetLoadError(ValueError):
    pass


def load_rag_dataset_file(path: Path) -> RAGDataset:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise RAGDatasetLoadError(f"Could not read RAG dataset file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RAGDatasetLoadError(f"Invalid JSON in RAG dataset file: {path}") from exc

    try:
        return RAGDataset.model_validate(raw)
    except ValidationError as exc:
        raise RAGDatasetLoadError(f"Invalid RAG dataset file: {path}") from exc


def load_rag_dataset_dir(path: Path) -> list[RAGDatasetRecord]:
    records: list[RAGDatasetRecord] = []
    for dataset_file in sorted(path.glob("*.json")):
        records.extend(load_rag_dataset_file(dataset_file).records)
    ids = [record.id for record in records]
    duplicates = sorted({record_id for record_id in ids if ids.count(record_id) > 1})
    if duplicates:
        raise RAGDatasetLoadError(f"Duplicate RAG record ids across dataset files: {', '.join(duplicates)}")
    return records


def records_by_source_type(records: Iterable[RAGDatasetRecord]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        counts[record.source_type] = counts.get(record.source_type, 0) + 1
    return counts


__all__ = [
    "RAGDatasetLoadError",
    "generate_rag_embedding_text",
    "load_rag_dataset_dir",
    "load_rag_dataset_file",
    "records_by_source_type",
]
