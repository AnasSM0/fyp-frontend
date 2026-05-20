from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import AssessmentSession
from app.models.integrity import IntegrityEvent
from app.models.user import User
from app.schemas.integrity import (
    IntegrityBatchResponse,
    IntegrityEventBatchCreate,
    IntegrityEventCreate,
    IntegrityEventRead,
    IntegritySummary,
)
from app.services.assessment_service import session_for_user

DEFAULT_SEVERITY = {
    "COPY_ATTEMPT": "low",
    "RIGHT_CLICK": "low",
    "TAB_HIDDEN": "medium",
    "WINDOW_BLUR": "medium",
    "WINDOW_FOCUS_LOST": "medium",
    "PASTE_ATTEMPT": "medium",
    "FULLSCREEN_EXIT": "medium",
    "NO_FACE_DETECTED": "medium",
    "FACE_AWAY": "medium",
    "EXCESSIVE_MOVEMENT": "medium",
    "LONG_INACTIVITY": "medium",
    "FAST_RESPONSE_ANOMALY": "medium",
    "CAMERA_DENIED": "high",
    "MULTIPLE_FACES_DETECTED": "high",
}

SEVERITY_WEIGHT = {"low": 1, "medium": 4, "high": 10}
SEVERITY_CAP = {"low": 5, "medium": 20, "high": 40}
DURATION_EVENT_TYPES = {
    "NO_FACE_DETECTED",
    "FACE_AWAY",
    "LONG_INACTIVITY",
    "WINDOW_BLUR",
    "TAB_HIDDEN",
}
DEDUP_WINDOW_MS = 2000


def normalized_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_dt(value: datetime | None) -> datetime:
    if value is None:
        return normalized_now()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def event_read(event: IntegrityEvent) -> IntegrityEventRead:
    return IntegrityEventRead.model_validate(event)


def ensure_active_session(session: AssessmentSession) -> None:
    if session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity events can only be submitted for an in-progress session",
        )


def existing_events_for_session(db: Session, session_id: str) -> list[IntegrityEvent]:
    return list(
        db.scalars(
            select(IntegrityEvent)
            .where(IntegrityEvent.session_id == session_id)
            .order_by(IntegrityEvent.occurred_at)
        )
    )


def is_duplicate_event(
    existing_events: list[IntegrityEvent],
    event_type: str,
    occurred_at: datetime,
) -> IntegrityEvent | None:
    for event in reversed(existing_events):
        existing_at = normalize_dt(event.occurred_at)
        delta_ms = abs((existing_at - occurred_at).total_seconds() * 1000)
        if event.event_type == event_type and delta_ms <= DEDUP_WINDOW_MS:
            return event
    return None


def create_integrity_event(
    db: Session,
    user: User,
    payload: IntegrityEventCreate,
) -> IntegrityEvent:
    session = session_for_user(db, payload.session_id, user)
    ensure_active_session(session)
    occurred_at = normalize_dt(payload.occurred_at)
    existing_events = existing_events_for_session(db, session.id)
    duplicate = is_duplicate_event(existing_events, payload.event_type, occurred_at)
    if duplicate is not None:
        return duplicate

    event = IntegrityEvent(
        session_id=session.id,
        candidate_id=session.candidate_id,
        event_type=payload.event_type,
        severity=payload.severity or DEFAULT_SEVERITY[payload.event_type],
        details_json=payload.details_json,
        duration_ms=payload.duration_ms,
        occurred_at=occurred_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def create_integrity_events_batch(
    db: Session,
    user: User,
    payload: IntegrityEventBatchCreate,
) -> IntegrityBatchResponse:
    accepted: list[IntegrityEvent] = []
    ignored_duplicates = 0
    existing_cache: dict[str, list[IntegrityEvent]] = defaultdict(list)

    for item in payload.events:
        session = session_for_user(db, item.session_id, user)
        ensure_active_session(session)
        occurred_at = normalize_dt(item.occurred_at)
        session_events = existing_cache[session.id]
        if not session_events:
            session_events.extend(existing_events_for_session(db, session.id))
        duplicate = is_duplicate_event(session_events, item.event_type, occurred_at)
        if duplicate is not None:
            ignored_duplicates += 1
            continue
        event = IntegrityEvent(
            session_id=session.id,
            candidate_id=session.candidate_id,
            event_type=item.event_type,
            severity=item.severity or DEFAULT_SEVERITY[item.event_type],
            details_json=item.details_json,
            duration_ms=item.duration_ms,
            occurred_at=occurred_at,
        )
        db.add(event)
        accepted.append(event)
        session_events.append(event)

    db.commit()
    for event in accepted:
        db.refresh(event)
    return IntegrityBatchResponse(
        events=[event_read(event) for event in accepted],
        ignored_duplicates=ignored_duplicates,
    )


def list_integrity_events(db: Session, session: AssessmentSession) -> list[IntegrityEvent]:
    return existing_events_for_session(db, session.id)


def integrity_penalty_for_score(integrity_score: int) -> int:
    if integrity_score < 60:
        return 15
    if integrity_score < 75:
        return 8
    if integrity_score < 90:
        return 3
    return 0


def summarize_integrity_events(events: list[IntegrityEvent]) -> IntegritySummary:
    events_by_type = Counter(event.event_type for event in events)
    events_by_severity = Counter(event.severity for event in events)
    total_duration_ms = sum(event.duration_ms for event in events)

    severity_penalties: dict[str, int] = {}
    for severity, weight in SEVERITY_WEIGHT.items():
        severity_penalties[severity] = min(
            events_by_severity.get(severity, 0) * weight,
            SEVERITY_CAP[severity],
        )

    repeated_penalty = 0
    for event_type, count in events_by_type.items():
        if count > 3:
            base = sum(
                SEVERITY_WEIGHT.get(event.severity, 0)
                for event in events
                if event.event_type == event_type
            )
            repeated_penalty += ceil(base * 0.25)
    repeated_penalty = min(repeated_penalty, 10)

    duration_penalty = 0
    for event in events:
        if event.event_type in DURATION_EVENT_TYPES and event.duration_ms > 10_000:
            duration_penalty += max(0, (event.duration_ms - 10_000) // 30_000)
    duration_penalty = min(int(duration_penalty), 15)

    total_penalty = sum(severity_penalties.values()) + repeated_penalty + duration_penalty
    integrity_score = max(0, min(100, 100 - total_penalty))

    if integrity_score >= 95:
        risk_level = "clean"
    elif integrity_score >= 85:
        risk_level = "low"
    elif integrity_score >= 70:
        risk_level = "moderate"
    else:
        risk_level = "high"

    strongest_flags = []
    for event_type, count in events_by_type.most_common(5):
        severities = Counter(event.severity for event in events if event.event_type == event_type)
        severity = severities.most_common(1)[0][0]
        reason = "Repeated signal"
        if event_type in {"CAMERA_DENIED", "MULTIPLE_FACES_DETECTED"}:
            reason = "High-risk proctoring signal"
        elif event_type in DURATION_EVENT_TYPES:
            reason = "Duration-based attention signal"
        strongest_flags.append(
            {
                "event_type": event_type,
                "count": count,
                "severity": severity,
                "reason": reason,
            }
        )

    if not events:
        summary = "No suspicious browser or webcam integrity events were recorded."
        recommendation = "No action needed."
    elif risk_level in {"clean", "low"}:
        summary = "Only minor integrity signals were recorded."
        recommendation = "Proceed normally; review only if other evidence is concerning."
    elif risk_level == "moderate":
        summary = "Moderate integrity risk detected from repeated or medium-severity signals."
        recommendation = "Review transcript timing and integrity flags before relying on the score."
    else:
        summary = "High integrity risk detected from severe or repeated signals."
        recommendation = "Manual review recommended before treating this assessment as verified."

    return IntegritySummary(
        integrity_score=integrity_score,
        risk_level=risk_level,
        summary=summary,
        events_by_type=dict(events_by_type),
        events_by_severity=dict(events_by_severity),
        strongest_flags=strongest_flags,
        recommendation=recommendation,
        total_events=len(events),
        total_duration_ms=total_duration_ms,
        penalty_breakdown={
            "low": severity_penalties["low"],
            "medium": severity_penalties["medium"],
            "high": severity_penalties["high"],
            "repeated": repeated_penalty,
            "duration": duration_penalty,
            "total": total_penalty,
        },
    )


def integrity_summary_for_session(db: Session, session: AssessmentSession) -> IntegritySummary:
    return summarize_integrity_events(list_integrity_events(db, session))
