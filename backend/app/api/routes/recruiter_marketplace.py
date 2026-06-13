from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import require_candidate, require_recruiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.recruiter_marketplace import (
    CandidateRequestListResponse,
    RecruiterCandidateProfileResponse,
    RecruiterCandidateSearchItem,
    RecruiterCandidateSearchResponse,
    RecruiterDashboardSummary,
    RecruiterInviteCreate,
    RecruiterInviteItem,
    RecruiterInviteListResponse,
)
from app.services.recruiter_marketplace_service import (
    candidate_requests,
    create_recruiter_invite,
    dashboard_summary,
    get_recruiter_candidate_profile,
    list_recruiter_invites,
    list_shortlisted_candidates,
    remove_shortlist_candidate,
    search_recruiter_candidates,
    shortlist_candidate,
)

recruiter_router = APIRouter(prefix="/api/v1/recruiter", tags=["recruiter marketplace"])
candidate_router = APIRouter(prefix="/api/v1/candidate", tags=["candidate requests"])


@recruiter_router.get("/dashboard/summary", response_model=RecruiterDashboardSummary)
def get_recruiter_dashboard_summary(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterDashboardSummary:
    return dashboard_summary(db, current_user)


@recruiter_router.get("/candidates/search", response_model=RecruiterCandidateSearchResponse)
def get_recruiter_candidate_search(
    q: str | None = Query(default=None, max_length=1200),
    role: str | None = Query(default=None, max_length=160),
    skills: str | None = Query(default=None, max_length=800),
    min_score: float | None = Query(default=None, ge=0, le=100),
    location: str | None = Query(default=None, max_length=160),
    availability: str | None = Query(default=None, max_length=40),
    sort: str | None = Query(default="match", pattern="^(match|score|recent)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterCandidateSearchResponse:
    return search_recruiter_candidates(
        db,
        current_user,
        q=q,
        role=role,
        skills=skills,
        min_score=min_score,
        location=location,
        availability=availability,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@recruiter_router.get("/candidates/{candidate_id}", response_model=RecruiterCandidateProfileResponse)
def get_recruiter_candidate(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterCandidateProfileResponse:
    return get_recruiter_candidate_profile(db, current_user, candidate_id)


@recruiter_router.post("/shortlist/{candidate_id}", response_model=RecruiterCandidateSearchItem)
def create_recruiter_shortlist(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterCandidateSearchItem:
    return shortlist_candidate(db, current_user, candidate_id)


@recruiter_router.delete("/shortlist/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recruiter_shortlist(
    candidate_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> Response:
    remove_shortlist_candidate(db, current_user, candidate_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@recruiter_router.get("/shortlist", response_model=RecruiterCandidateSearchResponse)
def get_recruiter_shortlist(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterCandidateSearchResponse:
    return list_shortlisted_candidates(db, current_user)


@recruiter_router.post("/invites", response_model=RecruiterInviteItem)
def post_recruiter_invite(
    payload: RecruiterInviteCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteItem:
    return create_recruiter_invite(db, current_user, payload)


@recruiter_router.get("/invites", response_model=RecruiterInviteListResponse)
def get_recruiter_invites_v1(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteListResponse:
    return list_recruiter_invites(db, current_user)


@candidate_router.get("/requests", response_model=CandidateRequestListResponse)
def get_candidate_requests_v1(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateRequestListResponse:
    return candidate_requests(db, current_user)
