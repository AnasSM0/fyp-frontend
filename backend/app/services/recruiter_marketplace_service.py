from __future__ import annotations

import re
from collections import OrderedDict

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.evaluation import EvaluationReport
from app.models.marketplace import ActivityEvent, Invite, SavedCandidate
from app.models.profile import CandidateProfile, CompanyProfile
from app.models.user import User
from app.schemas.recruiter_marketplace import (
    CandidateRequestCompany,
    CandidateRequestItem,
    CandidateRequestListResponse,
    RecruiterActivityItem,
    RecruiterCandidateProfileResponse,
    RecruiterCandidateSearchItem,
    RecruiterCandidateSearchResponse,
    RecruiterDashboardSummary,
    RecruiterInviteCandidateSummary,
    RecruiterInviteCreate,
    RecruiterInviteItem,
    RecruiterInviteListResponse,
    RecruiterReportPreview,
)
from app.services.activity_service import create_activity
from app.services.marketplace_service import ACCEPTED, PENDING, company_for_recruiter, normalize_role_title


TOKEN_RE = re.compile(r"[a-zA-Z0-9+#.]+")
ACTIVE_INVITE_STATUSES = {PENDING, ACCEPTED}


def tokens(value: str | None) -> set[str]:
    return {token.lower() for token in TOKEN_RE.findall(value or "") if len(token) > 1}


def latest_reports_by_candidate(db: Session) -> dict[str, EvaluationReport]:
    rows = db.scalars(
        select(EvaluationReport)
        .where(EvaluationReport.published.is_(True))
        .order_by(EvaluationReport.candidate_id, desc(EvaluationReport.updated_at), desc(EvaluationReport.created_at))
    ).all()
    reports: OrderedDict[str, EvaluationReport] = OrderedDict()
    for report in rows:
        reports.setdefault(report.candidate_id, report)
    return dict(reports)


def discoverable_profiles_with_reports(db: Session) -> list[tuple[CandidateProfile, EvaluationReport]]:
    reports = latest_reports_by_candidate(db)
    if not reports:
        return []
    profiles = db.scalars(
        select(CandidateProfile)
        .where(CandidateProfile.id.in_(reports.keys()), CandidateProfile.profile_visibility.is_(True))
        .order_by(desc(CandidateProfile.updated_at))
    ).all()
    return [(profile, reports[profile.id]) for profile in profiles if profile.id in reports]


def recruiter_shortlisted_ids(db: Session, recruiter: User) -> set[str]:
    return set(
        db.scalars(
            select(SavedCandidate.candidate_id).where(SavedCandidate.recruiter_id == recruiter.id)
        ).all()
    )


def recruiter_active_invites(db: Session, recruiter: User) -> dict[str, Invite]:
    rows = db.scalars(
        select(Invite)
        .where(Invite.recruiter_id == recruiter.id, Invite.status.in_(ACTIVE_INVITE_STATUSES))
        .order_by(desc(Invite.updated_at), desc(Invite.created_at))
    ).all()
    invites: OrderedDict[str, Invite] = OrderedDict()
    for invite in rows:
        invites.setdefault(invite.candidate_id, invite)
    return dict(invites)


def safe_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def report_strengths(report: EvaluationReport) -> list[str]:
    raw = (report.report_json or {}).get("strengths") or (report.report_json or {}).get("overall_strengths")
    if isinstance(raw, list):
        values = []
        for item in raw:
            if isinstance(item, dict):
                values.append(str(item.get("title") or item.get("summary") or item.get("text") or "").strip())
            else:
                values.append(str(item).strip())
        return [item for item in values if item][:5]
    return []


def report_growth_areas(report: EvaluationReport) -> list[str]:
    raw = (
        (report.report_json or {}).get("growth_areas")
        or (report.report_json or {}).get("weaknesses")
        or (report.report_json or {}).get("recommended_improvements")
    )
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()][:5]
    return []


def role_fit_text(report: EvaluationReport) -> str | None:
    role_fit = (report.report_json or {}).get("role_fit")
    if isinstance(role_fit, list) and role_fit:
        first = role_fit[0]
        if isinstance(first, dict):
            role = first.get("role")
            score = first.get("score")
            reason = first.get("reason")
            parts = [str(role) if role else None, f"{score}%" if score is not None else None, str(reason) if reason else None]
            return " - ".join(part for part in parts if part)
    if isinstance(role_fit, str):
        return role_fit
    return None


def question_feedback_preview(report: EvaluationReport) -> list[dict]:
    raw = (report.report_json or {}).get("question_wise_scores") or (report.report_json or {}).get("question_evaluations")
    if not isinstance(raw, list):
        return []
    preview: list[dict] = []
    for item in raw[:3]:
        if not isinstance(item, dict):
            continue
        preview.append(
            {
                "question_id": item.get("question_id") or item.get("assessment_question_id"),
                "question_text": item.get("question_text"),
                "score": item.get("score"),
                "feedback": item.get("feedback") or item.get("summary"),
            }
        )
    return preview


def profile_search_text(profile: CandidateProfile, report: EvaluationReport) -> str:
    parts = [
        profile.full_name,
        profile.target_role,
        profile.university,
        profile.degree,
        profile.experience_level,
        profile.availability_status,
        " ".join(profile.skills or []),
        " ".join(profile.tech_stack or []),
        report.recruiter_summary,
        str((report.report_json or {}).get("project_quality", "")),
        str((report.report_json or {}).get("role_fit", "")),
    ]
    return " ".join(part for part in parts if part)


def keyword_score(
    profile: CandidateProfile,
    report: EvaluationReport,
    *,
    q: str | None,
    skills: list[str],
    role: str | None,
) -> tuple[float, list[str]]:
    query_terms = tokens(q)
    skill_terms = {skill.lower() for skill in skills if skill.strip()}
    role_terms = tokens(role)
    candidate_terms = tokens(profile_search_text(profile, report))
    profile_skills = {item.lower() for item in [*(profile.skills or []), *(profile.tech_stack or [])]}
    requested = query_terms | skill_terms | role_terms
    if not requested:
        base = min(100, report.verified_score)
        return round(base, 2), list(profile_skills)[:5]
    matched_terms = requested & candidate_terms
    matched_skills = sorted(skill for skill in profile_skills if skill in matched_terms or any(part in matched_terms for part in tokens(skill)))
    overlap_score = (len(matched_terms) / max(1, len(requested))) * 70
    skill_bonus = min(20, len(matched_skills) * 5)
    verified_bonus = min(10, report.verified_score / 10)
    return round(min(100, overlap_score + skill_bonus + verified_bonus), 2), matched_skills[:8]


def report_assessment_status(report: EvaluationReport) -> str:
    session = report.session
    return session.status if isinstance(session, AssessmentSession) else "completed"


def match_explanation(profile: CandidateProfile, report: EvaluationReport, matched_skills: list[str], score: float) -> str:
    skills = ", ".join(matched_skills[:4]) if matched_skills else "profile evidence"
    return (
        f"Matched {profile.target_role or 'candidate profile'} using {skills}; "
        f"verified score {round(report.verified_score, 1)} contributes to a {round(score)}% keyword match."
    )


def candidate_item(
    profile: CandidateProfile,
    report: EvaluationReport,
    *,
    recruiter: User,
    shortlisted_ids: set[str],
    active_invites: dict[str, Invite],
    match_percent: float,
    matched_skills: list[str],
) -> RecruiterCandidateSearchItem:
    invite = active_invites.get(profile.id)
    return RecruiterCandidateSearchItem(
        candidate_id=profile.id,
        profile_id=profile.id,
        full_name=profile.full_name,
        target_role=profile.target_role,
        university=profile.university,
        degree=profile.degree,
        location=None,
        skills=profile.skills or [],
        tech_stack=profile.tech_stack or [],
        verified_score=round(report.verified_score, 2),
        semantic_match_percent=match_percent,
        match_explanation=match_explanation(profile, report, matched_skills, match_percent),
        assessment_status=report_assessment_status(report),
        profile_status="published",
        is_shortlisted=profile.id in shortlisted_ids,
        has_active_invite=invite is not None,
        invite_status=invite.status if invite else None,
        latest_report_id=report.id,
    )


def search_recruiter_candidates(
    db: Session,
    recruiter: User,
    *,
    q: str | None = None,
    role: str | None = None,
    skills: str | None = None,
    min_score: float | None = None,
    location: str | None = None,
    availability: str | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> RecruiterCandidateSearchResponse:
    del location
    skill_list = [skill.strip() for skill in (skills or "").split(",") if skill.strip()]
    shortlisted_ids = recruiter_shortlisted_ids(db, recruiter)
    active_invites = recruiter_active_invites(db, recruiter)
    rows: list[tuple[CandidateProfile, EvaluationReport, float, list[str]]] = []
    for profile, report in discoverable_profiles_with_reports(db):
        if min_score is not None and report.verified_score < min_score:
            continue
        if availability and profile.availability_status != availability:
            continue
        if role and role.lower() not in (profile.target_role or "").lower():
            continue
        if skill_list:
            profile_terms = {item.lower() for item in [*(profile.skills or []), *(profile.tech_stack or [])]}
            if not any(skill.lower() in profile_terms for skill in skill_list):
                continue
        score, matched = keyword_score(profile, report, q=q, skills=skill_list, role=role)
        if (q or skill_list or role) and score <= 0:
            continue
        rows.append((profile, report, score, matched))

    if sort == "score":
        rows.sort(key=lambda item: (item[1].verified_score, item[2]), reverse=True)
    elif sort == "recent":
        rows.sort(key=lambda item: (item[1].updated_at, item[1].created_at), reverse=True)
    else:
        rows.sort(key=lambda item: (item[2], item[1].verified_score), reverse=True)

    total = len(rows)
    safe_page = max(1, page)
    safe_page_size = min(50, max(1, page_size))
    start = (safe_page - 1) * safe_page_size
    page_rows = rows[start : start + safe_page_size]
    return RecruiterCandidateSearchResponse(
        items=[
            candidate_item(
                profile,
                report,
                recruiter=recruiter,
                shortlisted_ids=shortlisted_ids,
                active_invites=active_invites,
                match_percent=score,
                matched_skills=matched,
            )
            for profile, report, score, matched in page_rows
        ],
        total=total,
        page=safe_page,
        page_size=safe_page_size,
        matching_mode="keyword_fallback",
    )


def get_discoverable_profile_or_404(db: Session, candidate_id: str) -> tuple[CandidateProfile, EvaluationReport]:
    report = latest_reports_by_candidate(db).get(candidate_id)
    profile = db.get(CandidateProfile, candidate_id)
    if profile is None or report is None or not profile.profile_visibility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Published candidate not found")
    return profile, report


def get_recruiter_candidate_profile(db: Session, recruiter: User, candidate_id: str) -> RecruiterCandidateProfileResponse:
    profile, report = get_discoverable_profile_or_404(db, candidate_id)
    shortlisted = candidate_id in recruiter_shortlisted_ids(db, recruiter)
    active_invite = recruiter_active_invites(db, recruiter).get(candidate_id)
    report_json = report.report_json or {}
    latest_report = RecruiterReportPreview(
        report_id=report.id,
        assessment_session_id=report.session_id,
        overall_score=round(report.verified_score, 2),
        role_fit=role_fit_text(report),
        summary=report.recruiter_summary,
        strengths=report_strengths(report),
        growth_areas=report_growth_areas(report),
        question_feedback_preview=question_feedback_preview(report),
    )
    return RecruiterCandidateProfileResponse(
        candidate_id=profile.id,
        profile_id=profile.id,
        full_name=profile.full_name,
        target_role=profile.target_role,
        university=profile.university,
        degree=profile.degree,
        location=None,
        skills=profile.skills or [],
        tech_stack=profile.tech_stack or [],
        projects=safe_list(report_json.get("projects") or report_json.get("project_quality")),
        work_experience=[],
        verified_score=round(report.verified_score, 2),
        profile_evidence_score=round(report.project_quality_score, 2),
        academic_score=round(report.academic_score, 2),
        consistency_score=round((report.problem_solving_score + report.communication_score) / 2, 2),
        integrity_penalty=round(max(0, 100 - report.integrity_score), 2),
        latest_report=latest_report,
        is_shortlisted=shortlisted,
        has_active_invite=active_invite is not None,
        invite_status=active_invite.status if active_invite else None,
    )


def dashboard_summary(db: Session, recruiter: User) -> RecruiterDashboardSummary:
    verified_pool_count = len(discoverable_profiles_with_reports(db))
    shortlisted_count = db.scalar(
        select(func.count()).select_from(SavedCandidate).where(SavedCandidate.recruiter_id == recruiter.id)
    ) or 0
    pending_count = db.scalar(
        select(func.count()).select_from(Invite).where(Invite.recruiter_id == recruiter.id, Invite.status == PENDING)
    ) or 0
    accepted_count = db.scalar(
        select(func.count()).select_from(Invite).where(Invite.recruiter_id == recruiter.id, Invite.status == ACCEPTED)
    ) or 0
    events = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.user_id == recruiter.id)
        .order_by(desc(ActivityEvent.created_at))
        .limit(10)
    ).all()
    return RecruiterDashboardSummary(
        verified_pool_count=int(verified_pool_count),
        shortlisted_count=int(shortlisted_count),
        pending_requests_count=int(pending_count),
        accepted_requests_count=int(accepted_count),
        recent_activity=[
            RecruiterActivityItem(
                id=event.id,
                event_type=event.event_type,
                title=event.title,
                description=event.description,
                entity_type=event.entity_type,
                entity_id=event.entity_id,
                created_at=event.created_at,
            )
            for event in events
        ],
    )


def shortlist_candidate(db: Session, recruiter: User, candidate_id: str) -> RecruiterCandidateSearchItem:
    profile, report = get_discoverable_profile_or_404(db, candidate_id)
    existing = db.scalar(
        select(SavedCandidate).where(SavedCandidate.recruiter_id == recruiter.id, SavedCandidate.candidate_id == candidate_id)
    )
    if existing is None:
        db.add(SavedCandidate(recruiter_id=recruiter.id, candidate_id=candidate_id))
        create_activity(
            db,
            user_id=recruiter.id,
            actor_user_id=recruiter.id,
            event_type="candidate_shortlisted",
            title="Candidate shortlisted",
            description=f"Shortlisted {profile.full_name or 'candidate'} for review.",
            entity_type="candidate",
            entity_id=candidate_id,
            metadata={"candidate_id": candidate_id, "verified_score": report.verified_score},
        )
        db.commit()
    shortlisted_ids = recruiter_shortlisted_ids(db, recruiter)
    active_invites = recruiter_active_invites(db, recruiter)
    score, matched = keyword_score(profile, report, q=None, skills=[], role=None)
    return candidate_item(
        profile,
        report,
        recruiter=recruiter,
        shortlisted_ids=shortlisted_ids,
        active_invites=active_invites,
        match_percent=score,
        matched_skills=matched,
    )


def remove_shortlist_candidate(db: Session, recruiter: User, candidate_id: str) -> None:
    saved = db.scalar(
        select(SavedCandidate).where(SavedCandidate.recruiter_id == recruiter.id, SavedCandidate.candidate_id == candidate_id)
    )
    if saved is None:
        return
    db.delete(saved)
    create_activity(
        db,
        user_id=recruiter.id,
        actor_user_id=recruiter.id,
        event_type="candidate_unshortlisted",
        title="Candidate removed from shortlist",
        description="Removed candidate from shortlist.",
        entity_type="candidate",
        entity_id=candidate_id,
        metadata={"candidate_id": candidate_id},
    )
    db.commit()


def list_shortlisted_candidates(db: Session, recruiter: User) -> RecruiterCandidateSearchResponse:
    saved_rows = db.scalars(
        select(SavedCandidate)
        .where(SavedCandidate.recruiter_id == recruiter.id)
        .order_by(desc(SavedCandidate.created_at))
    ).all()
    report_map = latest_reports_by_candidate(db)
    shortlisted_ids = {item.candidate_id for item in saved_rows}
    active_invites = recruiter_active_invites(db, recruiter)
    items = []
    for saved in saved_rows:
        profile = saved.candidate
        report = report_map.get(saved.candidate_id)
        if profile is None or report is None or not profile.profile_visibility:
            continue
        score, matched = keyword_score(profile, report, q=None, skills=[], role=None)
        items.append(
            candidate_item(
                profile,
                report,
                recruiter=recruiter,
                shortlisted_ids=shortlisted_ids,
                active_invites=active_invites,
                match_percent=score,
                matched_skills=matched,
            )
        )
    return RecruiterCandidateSearchResponse(
        items=items,
        total=len(items),
        page=1,
        page_size=max(10, len(items)),
        matching_mode="keyword_fallback",
    )


def invite_item(db: Session, invite: Invite) -> RecruiterInviteItem:
    report = latest_reports_by_candidate(db).get(invite.candidate_id)
    profile = invite.candidate
    return RecruiterInviteItem(
        id=invite.id,
        candidate_id=invite.candidate_id,
        role_title=invite.role_title,
        message=invite.message,
        interview_mode=invite.opportunity_type,
        status=invite.status,
        created_at=invite.created_at,
        updated_at=invite.updated_at,
        candidate=RecruiterInviteCandidateSummary(
            candidate_id=profile.id,
            full_name=profile.full_name,
            target_role=profile.target_role,
            university=profile.university,
            verified_score=round(report.verified_score, 2) if report else None,
        ),
    )


def list_recruiter_invites(db: Session, recruiter: User) -> RecruiterInviteListResponse:
    rows = db.scalars(select(Invite).where(Invite.recruiter_id == recruiter.id).order_by(desc(Invite.created_at))).all()
    return RecruiterInviteListResponse(items=[invite_item(db, invite) for invite in rows])


def create_recruiter_invite(db: Session, recruiter: User, payload: RecruiterInviteCreate) -> RecruiterInviteItem:
    profile, report = get_discoverable_profile_or_404(db, payload.candidate_id)
    duplicate = db.scalar(
        select(Invite).where(
            Invite.recruiter_id == recruiter.id,
            Invite.candidate_id == profile.id,
            Invite.status.in_(ACTIVE_INVITE_STATUSES),
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active invite already exists for this candidate.",
        )
    company = company_for_recruiter(db, recruiter)
    role_title = (payload.proposed_role or profile.target_role or "Interview Request").strip()
    message = (
        payload.message
        or f"We reviewed your verified HirdUp profile and would like to request an interview for {role_title}."
    ).strip()
    opportunity_type = payload.interview_mode or "interview"
    invite = Invite(
        candidate_id=profile.id,
        recruiter_id=recruiter.id,
        company_id=company.id if company else None,
        role_title=role_title,
        normalized_role_title=normalize_role_title(role_title),
        message=message,
        salary_range=None,
        opportunity_type=opportunity_type,
        interview_window=None,
        note=None,
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
        description=f"Sent {role_title} request to {profile.full_name or 'candidate'}.",
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
        description=f"{company.company_name if company else 'A recruiter'} requested you for {role_title}.",
        entity_type="invite",
        entity_id=invite.id,
        metadata={"candidate_id": profile.id, "recruiter_id": recruiter.id},
    )
    db.commit()
    db.refresh(invite)
    return invite_item(db, invite)


def candidate_requests(db: Session, candidate_user: User) -> CandidateRequestListResponse:
    profile = candidate_user.candidate_profile
    if profile is None:
        return CandidateRequestListResponse(items=[])
    rows = db.scalars(select(Invite).where(Invite.candidate_id == profile.id).order_by(desc(Invite.created_at))).all()
    items = []
    for invite in rows:
        company: CompanyProfile | None = invite.company
        items.append(
            CandidateRequestItem(
                id=invite.id,
                recruiter_id=invite.recruiter_id,
                company=CandidateRequestCompany(
                    company_name=company.company_name if company else "Recruiter",
                    recruiter_name=company.recruiter_name if company else invite.recruiter.email,
                    industry=company.industry if company else None,
                ),
                role_title=invite.role_title,
                message=invite.message,
                interview_mode=invite.opportunity_type,
                status=invite.status,
                created_at=invite.created_at,
                updated_at=invite.updated_at,
            )
        )
    return CandidateRequestListResponse(items=items)
