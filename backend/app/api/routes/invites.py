from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_candidate, require_recruiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.marketplace import (
    CandidateInviteListResponse,
    CandidateInviteRead,
    InviteCreate,
    InviteRespond,
    RecruiterInviteListResponse,
    RecruiterInviteRead,
)
from app.services.marketplace_service import (
    candidate_invite_by_id,
    candidate_invite_read,
    candidate_invites,
    create_invite,
    recruiter_invite_by_id,
    recruiter_invite_read,
    recruiter_invites,
    respond_to_invite,
    withdraw_invite,
)

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post("", response_model=RecruiterInviteRead)
def send_invite(
    payload: InviteCreate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteRead:
    return create_invite(db, current_user, payload)


@router.get("/recruiter", response_model=RecruiterInviteListResponse)
def get_recruiter_invites(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteListResponse:
    return recruiter_invites(db, current_user)


@router.get("/recruiter/{invite_id}", response_model=RecruiterInviteRead)
def get_recruiter_invite(
    invite_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteRead:
    return recruiter_invite_read(db, recruiter_invite_by_id(db, current_user, invite_id))


@router.patch("/{invite_id}/withdraw", response_model=RecruiterInviteRead)
def withdraw_recruiter_invite(
    invite_id: str,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> RecruiterInviteRead:
    return withdraw_invite(db, current_user, invite_id)


@router.get("/candidate", response_model=CandidateInviteListResponse)
def get_candidate_invites(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateInviteListResponse:
    return candidate_invites(db, current_user)


@router.get("/candidate/{invite_id}", response_model=CandidateInviteRead)
def get_candidate_invite(
    invite_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateInviteRead:
    return candidate_invite_read(candidate_invite_by_id(db, current_user, invite_id))


@router.patch("/{invite_id}/respond", response_model=CandidateInviteRead)
def respond_candidate_invite(
    invite_id: str,
    payload: InviteRespond,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateInviteRead:
    return respond_to_invite(db, current_user, invite_id, payload)
