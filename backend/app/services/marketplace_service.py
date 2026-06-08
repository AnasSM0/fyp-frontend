from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.evaluation import EvaluationReport
from app.models.marketplace import Invite, SavedCandidate
from app.models.profile import CandidateProfile, CompanyProfile
from app.models.user import User
from app.schemas.marketplace import (
    CandidateInviteListResponse,
    CandidateInviteRead,
    CandidateMarketplaceSummary,
    CompanyMarketplaceSummary,
    InviteCreate,
    InviteRead,
    InviteRespond,
    RecruiterInviteListResponse,
    RecruiterInviteRead,
    SavedCandidateListResponse,
    SavedCandidateRead,
    SavedCandidateStatus,
)
from app.services.activity_service import create_activity


PENDING = "pending"
ACCEPTED = "accepted"
DECLINED = "declined"
WITHDRAWN = "withdrawn"


def normalize_role_title(role_title: str) -> str:
    return " ".join(role_title.strip().lower().split())


def latest_published_report(db: Session, candidate_id: str) -> EvaluationReport | None:
    return db.scalar(
        select(EvaluationReport)
        .where(EvaluationReport.candidate_id == candidate_id, EvaluationReport.published.is_(True))
        .order_by(desc(EvaluationReport.updated_at), desc(EvaluationReport.created_at))
    )


def ensure_discoverable_candidate(db: Session, candidate_id: str) -> tuple[CandidateProfile, EvaluationReport]:
    profile = db.get(CandidateProfile, candidate_id)
    if profile is None or not profile.profile_visibility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discoverable candidate not found")
    report = latest_published_report(db, candidate_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discoverable candidate not found")
    return profile, report


def company_for_recruiter(db: Session, recruiter: User) -> CompanyProfile | None:
    return db.scalar(select(CompanyProfile).where(CompanyProfile.user_id == recruiter.id))


def candidate_summary(profile: CandidateProfile, report: EvaluationReport | None = None) -> CandidateMarketplaceSummary:
    return CandidateMarketplaceSummary(
        id=profile.id,
        full_name=profile.full_name,
        university=profile.university,
        target_role=profile.target_role,
        skills=profile.skills,
        tech_stack=profile.tech_stack,
        availability_status=profile.availability_status,
        profile_visibility=profile.profile_visibility,
        verified_score=round(report.verified_score, 2) if report else None,
        recruiter_summary=report.recruiter_summary if report else None,
    )


def company_summary(company: CompanyProfile | None, recruiter: User | None = None) -> CompanyMarketplaceSummary:
    return CompanyMarketplaceSummary(
        id=company.id if company else None,
        company_name=company.company_name if company else "HirdUp Demo Company",
        recruiter_name=company.recruiter_name if company else (recruiter.email if recruiter else None),
        industry=company.industry if company else None,
        website=company.website if company else None,
    )


def saved_candidate_read(db: Session, saved: SavedCandidate) -> SavedCandidateRead:
    report = latest_published_report(db, saved.candidate_id)
    return SavedCandidateRead(
        id=saved.id,
        candidate=candidate_summary(saved.candidate, report),
        saved_at=saved.created_at,
    )


def save_candidate(db: Session, recruiter: User, candidate_id: str) -> SavedCandidateRead:
    profile, report = ensure_discoverable_candidate(db, candidate_id)
    existing = db.scalar(
        select(SavedCandidate).where(
            SavedCandidate.recruiter_id == recruiter.id,
            SavedCandidate.candidate_id == candidate_id,
        )
    )
    if existing is not None:
        return saved_candidate_read(db, existing)
    saved = SavedCandidate(recruiter_id=recruiter.id, candidate_id=candidate_id)
    db.add(saved)
    db.flush()
    create_activity(
        db,
        user_id=recruiter.id,
        actor_user_id=recruiter.id,
        event_type="candidate_saved",
        title="Candidate saved",
        description=f"Saved {profile.full_name or 'candidate'} to shortlist.",
        entity_type="candidate",
        entity_id=candidate_id,
        metadata={"candidate_id": candidate_id, "verified_score": report.verified_score},
    )
    db.commit()
    db.refresh(saved)
    return saved_candidate_read(db, saved)


def remove_saved_candidate(db: Session, recruiter: User, candidate_id: str) -> None:
    saved = db.scalar(
        select(SavedCandidate).where(
            SavedCandidate.recruiter_id == recruiter.id,
            SavedCandidate.candidate_id == candidate_id,
        )
    )
    if saved is None:
        return
    candidate_name = saved.candidate.full_name if saved.candidate else "candidate"
    db.delete(saved)
    create_activity(
        db,
        user_id=recruiter.id,
        actor_user_id=recruiter.id,
        event_type="candidate_unsaved",
        title="Candidate removed",
        description=f"Removed {candidate_name or 'candidate'} from shortlist.",
        entity_type="candidate",
        entity_id=candidate_id,
        metadata={"candidate_id": candidate_id},
    )
    db.commit()


def list_saved_candidates(db: Session, recruiter: User) -> SavedCandidateListResponse:
    rows = db.scalars(
        select(SavedCandidate)
        .where(SavedCandidate.recruiter_id == recruiter.id)
        .order_by(desc(SavedCandidate.created_at))
    ).all()
    return SavedCandidateListResponse(items=[saved_candidate_read(db, row) for row in rows])


def saved_status(db: Session, recruiter: User, candidate_id: str) -> SavedCandidateStatus:
    saved = db.scalar(
        select(SavedCandidate).where(
            SavedCandidate.recruiter_id == recruiter.id,
            SavedCandidate.candidate_id == candidate_id,
        )
    )
    return SavedCandidateStatus(
        candidate_id=candidate_id,
        saved=saved is not None,
        saved_candidate_id=saved.id if saved else None,
    )


def invite_read(invite: Invite) -> InviteRead:
    return InviteRead.model_validate(invite)


def recruiter_invite_read(db: Session, invite: Invite) -> RecruiterInviteRead:
    report = latest_published_report(db, invite.candidate_id)
    base = invite_read(invite).model_dump()
    return RecruiterInviteRead(**base, candidate=candidate_summary(invite.candidate, report))


def candidate_invite_read(invite: Invite) -> CandidateInviteRead:
    base = invite_read(invite).model_dump()
    return CandidateInviteRead(**base, company=company_summary(invite.company, invite.recruiter))


def create_invite(db: Session, recruiter: User, payload: InviteCreate) -> RecruiterInviteRead:
    profile, report = ensure_discoverable_candidate(db, payload.candidate_id)
    normalized = normalize_role_title(payload.role_title)
    duplicate = db.scalar(
        select(Invite).where(
            Invite.recruiter_id == recruiter.id,
            Invite.candidate_id == payload.candidate_id,
            Invite.normalized_role_title == normalized,
            Invite.status == PENDING,
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pending invite already exists for this candidate and role",
        )
    company = company_for_recruiter(db, recruiter)
    invite = Invite(
        candidate_id=payload.candidate_id,
        recruiter_id=recruiter.id,
        company_id=company.id if company else None,
        role_title=payload.role_title.strip(),
        normalized_role_title=normalized,
        message=payload.message,
        salary_range=payload.salary_range,
        opportunity_type=payload.opportunity_type,
        interview_window=payload.interview_window,
        note=payload.note,
        status=PENDING,
    )
    db.add(invite)
    db.flush()
    create_activity(
        db,
        user_id=recruiter.id,
        actor_user_id=recruiter.id,
        event_type="invite_sent",
        title="Invite sent",
        description=f"Sent {invite.role_title} request to {profile.full_name or 'candidate'}.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"candidate_id": profile.id, "verified_score": report.verified_score},
    )
    create_activity(
        db,
        user_id=profile.user_id,
        actor_user_id=recruiter.id,
        event_type="invite_sent",
        title="Recruiter request received",
        description=f"{company.company_name if company else 'A recruiter'} requested you for {invite.role_title}.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"candidate_id": profile.id, "recruiter_id": recruiter.id},
    )
    db.commit()
    db.refresh(invite)
    return recruiter_invite_read(db, invite)


def recruiter_invites(db: Session, recruiter: User) -> RecruiterInviteListResponse:
    rows = db.scalars(
        select(Invite).where(Invite.recruiter_id == recruiter.id).order_by(desc(Invite.created_at))
    ).all()
    return RecruiterInviteListResponse(items=[recruiter_invite_read(db, row) for row in rows])


def candidate_invites(db: Session, candidate_user: User) -> CandidateInviteListResponse:
    profile = candidate_user.candidate_profile
    if profile is None:
        return CandidateInviteListResponse(items=[])
    rows = db.scalars(
        select(Invite).where(Invite.candidate_id == profile.id).order_by(desc(Invite.created_at))
    ).all()
    return CandidateInviteListResponse(items=[candidate_invite_read(row) for row in rows])


def recruiter_invite_by_id(db: Session, recruiter: User, invite_id: str) -> Invite:
    invite = db.scalar(select(Invite).where(Invite.id == invite_id, Invite.recruiter_id == recruiter.id))
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invite


def candidate_invite_by_id(db: Session, candidate_user: User, invite_id: str) -> Invite:
    profile = candidate_user.candidate_profile
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    invite = db.scalar(select(Invite).where(Invite.id == invite_id, Invite.candidate_id == profile.id))
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invite


def withdraw_invite(db: Session, recruiter: User, invite_id: str) -> RecruiterInviteRead:
    invite = recruiter_invite_by_id(db, recruiter, invite_id)
    if invite.status != PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending invites can be withdrawn")
    invite.status = WITHDRAWN
    invite.responded_at = datetime.now(timezone.utc)
    create_activity(
        db,
        user_id=recruiter.id,
        actor_user_id=recruiter.id,
        event_type="invite_withdrawn",
        title="Invite withdrawn",
        description=f"Withdrew {invite.role_title} request.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"candidate_id": invite.candidate_id},
    )
    create_activity(
        db,
        user_id=invite.candidate.user_id,
        actor_user_id=recruiter.id,
        event_type="invite_withdrawn",
        title="Recruiter request withdrawn",
        description=f"{invite.role_title} request was withdrawn.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"recruiter_id": recruiter.id},
    )
    db.commit()
    db.refresh(invite)
    return recruiter_invite_read(db, invite)


def respond_to_invite(
    db: Session,
    candidate_user: User,
    invite_id: str,
    payload: InviteRespond,
) -> CandidateInviteRead:
    invite = candidate_invite_by_id(db, candidate_user, invite_id)
    if invite.status != PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending invites can be answered")
    invite.status = payload.status
    invite.response_message = payload.response_message
    invite.responded_at = datetime.now(timezone.utc)
    event_type = "invite_accepted" if payload.status == ACCEPTED else "invite_declined"
    title = "Invite accepted" if payload.status == ACCEPTED else "Invite declined"
    create_activity(
        db,
        user_id=candidate_user.id,
        actor_user_id=candidate_user.id,
        event_type=event_type,
        title=title,
        description=f"You {payload.status} the {invite.role_title} request.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"recruiter_id": invite.recruiter_id},
    )
    create_activity(
        db,
        user_id=invite.recruiter_id,
        actor_user_id=candidate_user.id,
        event_type=event_type,
        title=title,
        description=f"{invite.candidate.full_name or 'Candidate'} {payload.status} your {invite.role_title} request.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"candidate_id": invite.candidate_id},
    )
    db.commit()
    db.refresh(invite)
    return candidate_invite_read(invite)
