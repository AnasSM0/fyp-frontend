from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_candidate, require_recruiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.semantic import CandidateEmbeddingRebuildResponse, CandidateEmbeddingStatus
from app.services.candidate_embedding_service import (
    embedding_status_for_user,
    rebuild_candidate_embedding_for_recruiter,
    rebuild_own_embedding,
)

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


@router.post("/candidates/me/rebuild", response_model=CandidateEmbeddingRebuildResponse)
def rebuild_my_candidate_embedding(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateEmbeddingRebuildResponse:
    return rebuild_own_embedding(db, current_user)


@router.get("/candidates/me/status", response_model=CandidateEmbeddingStatus)
def get_my_candidate_embedding_status(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateEmbeddingStatus:
    return embedding_status_for_user(db, current_user)


@router.post("/candidates/{candidate_id}/rebuild", response_model=CandidateEmbeddingRebuildResponse)
def rebuild_candidate_embedding_demo(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> CandidateEmbeddingRebuildResponse:
    return rebuild_candidate_embedding_for_recruiter(db, candidate_id)
