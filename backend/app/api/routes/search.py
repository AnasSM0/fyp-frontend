from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_recruiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.semantic import CandidateSearchRequest, CandidateSearchResponse, RecruiterSearchRead
from app.services.candidate_search_service import search_candidates, search_history_for_recruiter

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/candidates", response_model=CandidateSearchResponse)
def search_candidate_marketplace(
    payload: CandidateSearchRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> CandidateSearchResponse:
    return search_candidates(db, current_user, payload)


@router.get("/history", response_model=list[RecruiterSearchRead])
def get_search_history(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> list[RecruiterSearchRead]:
    return search_history_for_recruiter(db, current_user)
