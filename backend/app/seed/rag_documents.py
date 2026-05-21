from __future__ import annotations

import argparse
from dataclasses import asdict
from pathlib import Path

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.rag_ingestion_service import (
    import_rag_documents,
    rebuild_rag_embeddings,
    summarize_rag_documents,
    validate_rag_dataset_path,
)
from app.schemas.rag import RagRetrievalRequest
from app.services.rag_retrieval_service import retrieve_rag_documents


def print_summary(action: str, summary) -> None:
    print(f"RAG {action} complete.")
    for key, value in asdict(summary).items():
        print(f"{key}: {value}")


def csv_values(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def print_retrieval(response) -> None:
    print(f"RAG retrieve complete. results={response.result_count} fallback_used={response.fallback_used}")
    print(f"provider: {response.provider_metadata.provider} model: {response.provider_metadata.model}")
    for index, result in enumerate(response.results, start=1):
        print(
            f"{index}. {result.document_id} | {result.title} | "
            f"{result.source_type}/{result.category} | score={result.score.final_score}"
        )
        print(
            f"   vector={result.score.vector_score} stack={result.score.tech_stack_score} "
            f"role={result.score.role_score} difficulty={result.score.difficulty_score}"
        )
        if result.why_matched:
            print(f"   why: {result.why_matched}")


def main() -> None:
    settings = get_settings()
    parser = argparse.ArgumentParser(description="Validate, import, and summarize XLR8Hire RAG documents.")
    subcommands = parser.add_subparsers(dest="command", required=True)

    validate_parser = subcommands.add_parser("validate", help="Validate RAG dataset JSON files.")
    validate_parser.add_argument("dataset_path", nargs="?", default=settings.rag_dataset_path)

    import_parser = subcommands.add_parser("import", help="Import RAG dataset JSON files into the database.")
    import_parser.add_argument("dataset_path", nargs="?", default=settings.rag_dataset_path)
    import_parser.add_argument("--no-embeddings", action="store_true", help="Import documents without embeddings.")
    import_parser.add_argument(
        "--deactivate-missing",
        action="store_true",
        help="Mark DB documents inactive when absent from the imported dataset.",
    )

    rebuild_parser = subcommands.add_parser("rebuild-embeddings", help="Rebuild embeddings for active RAG docs.")
    rebuild_parser.add_argument("--source-type", default=None)

    retrieve_parser = subcommands.add_parser("retrieve", help="Debug RAG retrieval scoring.")
    retrieve_parser.add_argument("--query", default="")
    retrieve_parser.add_argument("--role", default=None)
    retrieve_parser.add_argument("--stack", default="")
    retrieve_parser.add_argument("--skills", default="")
    retrieve_parser.add_argument("--source-types", default="question,coding_task")
    retrieve_parser.add_argument("--difficulty", default="intermediate")
    retrieve_parser.add_argument("--experience-level", default="student")
    retrieve_parser.add_argument("--top-k", type=int, default=8)
    retrieve_parser.add_argument("--min-similarity", type=float, default=0)
    retrieve_parser.add_argument("--no-diversity", action="store_true")

    subcommands.add_parser("summary", help="Show active RAG document summary.")

    args = parser.parse_args()

    if args.command == "validate":
        print_summary("validation", validate_rag_dataset_path(Path(args.dataset_path)))
        return

    with SessionLocal() as db:
        if args.command == "import":
            summary = import_rag_documents(
                db,
                Path(args.dataset_path),
                deactivate_missing=args.deactivate_missing,
                generate_embeddings=not args.no_embeddings,
            )
            print_summary("import", summary)
        elif args.command == "rebuild-embeddings":
            print_summary("embedding rebuild", rebuild_rag_embeddings(db, source_type=args.source_type))
        elif args.command == "summary":
            print_summary("summary", summarize_rag_documents(db))
        elif args.command == "retrieve":
            stack = csv_values(args.stack)
            skills = csv_values(args.skills)
            query_text = args.query or (
                f"Role: {args.role or 'unspecified'}\n"
                f"Stack: {', '.join(stack)}\n"
                f"Skills: {', '.join(skills)}"
            )
            response = retrieve_rag_documents(
                db,
                RagRetrievalRequest(
                    query_text=query_text,
                    source_types=csv_values(args.source_types),
                    target_role=args.role,
                    tech_stack=stack,
                    skills=skills,
                    difficulty=args.difficulty,
                    experience_level=args.experience_level,
                    top_k=args.top_k,
                    min_similarity=args.min_similarity,
                    diversity_enabled=not args.no_diversity,
                    debug=True,
                ),
            )
            print_retrieval(response)


if __name__ == "__main__":
    main()
