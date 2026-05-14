from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_candidate, require_recruiter
from app.db.session import get_db
from app.models.profile import CandidateProfile, CompanyProfile
from app.models.user import User
from app.schemas.profile import (
    CandidateProfileRead,
    CandidateProfileUpdate,
    CompanyProfileRead,
    CompanyProfileUpdate,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/candidate/me", response_model=CandidateProfileRead)
def get_candidate_profile(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateProfile:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == current_user.id))
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found",
        )
    return profile


@router.put("/candidate/me", response_model=CandidateProfileRead)
def upsert_candidate_profile(
    payload: CandidateProfileUpdate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateProfile:
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == current_user.id))
    data = payload.model_dump()

    if profile is None:
        profile = CandidateProfile(user_id=current_user.id, **data)
        db.add(profile)
    else:
        for key, value in data.items():
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/company/me", response_model=CompanyProfileRead)
def get_company_profile(
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> CompanyProfile:
    profile = db.scalar(select(CompanyProfile).where(CompanyProfile.user_id == current_user.id))
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company profile not found",
        )
    return profile


@router.put("/company/me", response_model=CompanyProfileRead)
def upsert_company_profile(
    payload: CompanyProfileUpdate,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
) -> CompanyProfile:
    profile = db.scalar(select(CompanyProfile).where(CompanyProfile.user_id == current_user.id))
    data = payload.model_dump()

    if profile is None:
        profile = CompanyProfile(user_id=current_user.id, **data)
        db.add(profile)
    else:
        for key, value in data.items():
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
