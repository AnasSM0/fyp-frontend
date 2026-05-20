from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_recruiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.marketplace import (
    SavedCandidateListResponse,
    SavedCandidateRead,
    SavedCandidateStatus,
)
from app.services.marketplace_service import (
    list_saved_candidates,
    remove_saved_candidate,
    save_candidate,
    saved_status,
)

router = APIRouter(prefix="/saved-candidates", tags=["saved candidates"])


@router.post("/{candidate_id}", response_model=SavedCandidateRead)
def save_marketplace_candidate(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> SavedCandidateRead:
    return save_candidate(db, current_user, candidate_id)


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_marketplace_candidate(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> Response:
    remove_saved_candidate(db, current_user, candidate_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=SavedCandidateListResponse)
def get_saved_marketplace_candidates(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> SavedCandidateListResponse:
    return list_saved_candidates(db, current_user)


@router.get("/{candidate_id}/status", response_model=SavedCandidateStatus)
def get_saved_marketplace_candidate_status(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> SavedCandidateStatus:
    return saved_status(db, current_user, candidate_id)
