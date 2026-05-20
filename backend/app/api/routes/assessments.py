from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_candidate
from app.db.session import get_db
from app.models.user import User
from app.schemas.assessment import (
    AssessmentSessionDetail,
    CurrentQuestionResponse,
    FinishAssessmentRequest,
    QuestionBankSummary,
    StartAssessmentRequest,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.assessment_service import (
    current_question_response,
    finish_session,
    get_candidate_profile_for_user,
    latest_session,
    question_bank_summary,
    session_detail,
    session_for_user,
    start_assessment_session,
    submit_answer,
)

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("/question-bank/summary", response_model=QuestionBankSummary)
def get_question_bank_summary(db: Session = Depends(get_db)) -> QuestionBankSummary:
    return question_bank_summary(db)


@router.post("/sessions", response_model=AssessmentSessionDetail)
def create_assessment_session(
    payload: StartAssessmentRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> AssessmentSessionDetail:
    return start_assessment_session(db, current_user, force_new=payload.force_new)


@router.get("/sessions/me/latest", response_model=AssessmentSessionDetail | None)
def get_latest_session(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> AssessmentSessionDetail | None:
    profile = get_candidate_profile_for_user(db, current_user)
    if profile is None:
        return None
    session = latest_session(db, profile)
    return session_detail(session) if session is not None else None


@router.get("/sessions/{session_id}", response_model=AssessmentSessionDetail)
def get_assessment_session(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> AssessmentSessionDetail:
    session = session_for_user(db, session_id, current_user)
    return session_detail(session)


@router.get("/sessions/{session_id}/current-question", response_model=CurrentQuestionResponse)
def get_current_question(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CurrentQuestionResponse:
    session = session_for_user(db, session_id, current_user)
    return current_question_response(session)


@router.post("/sessions/{session_id}/answers", response_model=SubmitAnswerResponse)
def create_answer(
    session_id: str,
    payload: SubmitAnswerRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> SubmitAnswerResponse:
    session = session_for_user(db, session_id, current_user)
    return submit_answer(db, session, payload)


@router.post("/sessions/{session_id}/finish", response_model=AssessmentSessionDetail)
def finish_assessment_session(
    session_id: str,
    _: FinishAssessmentRequest | None = None,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> AssessmentSessionDetail:
    session = session_for_user(db, session_id, current_user)
    return finish_session(db, session)
