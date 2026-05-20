from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_candidate
from app.db.session import get_db
from app.models.user import User
from app.schemas.integrity import (
    IntegrityBatchResponse,
    IntegrityEventBatchCreate,
    IntegrityEventCreate,
    IntegrityEventRead,
    IntegritySummary,
)
from app.services.assessment_service import session_for_user
from app.services.integrity_service import (
    create_integrity_event,
    create_integrity_events_batch,
    event_read,
    integrity_summary_for_session,
    list_integrity_events,
)

router = APIRouter(prefix="/integrity", tags=["integrity"])


@router.post("/events", response_model=IntegrityEventRead)
def submit_integrity_event(
    payload: IntegrityEventCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> IntegrityEventRead:
    return event_read(create_integrity_event(db, current_user, payload))


@router.post("/events/batch", response_model=IntegrityBatchResponse)
def submit_integrity_events_batch(
    payload: IntegrityEventBatchCreate,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> IntegrityBatchResponse:
    return create_integrity_events_batch(db, current_user, payload)


@router.get("/sessions/{session_id}", response_model=list[IntegrityEventRead])
def get_integrity_events(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> list[IntegrityEventRead]:
    session = session_for_user(db, session_id, current_user)
    return [event_read(event) for event in list_integrity_events(db, session)]


@router.get("/sessions/{session_id}/summary", response_model=IntegritySummary)
def get_integrity_summary(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> IntegritySummary:
    session = session_for_user(db, session_id, current_user)
    return integrity_summary_for_session(db, session)
