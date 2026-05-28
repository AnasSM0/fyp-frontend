from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_candidate
from app.db.session import get_db
from app.models.user import User
from app.schemas.assessment import (
    AssessmentSessionDetail,
    CurrentQuestionResponse,
    FinishAssessmentRequest,
    QuestionBankSummary,
    RunCodeRequest,
    RunCodeResponse,
    StartAssessmentRequest,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.assessment_service import (
    current_question,
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
from app.services.code_execution_service import run_python_code_for_question

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


@router.post(
    "/sessions/{session_id}/questions/{question_id}/run-code",
    response_model=RunCodeResponse,
)
def run_question_code(
    session_id: str,
    question_id: str,
    payload: RunCodeRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> RunCodeResponse:
    session = session_for_user(db, session_id, current_user)
    question = current_question(session)
    if question is None or question.id != question_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Code can only be run for the current assessment question",
        )
    return run_python_code_for_question(question, payload.code)


@router.post("/sessions/{session_id}/finish", response_model=AssessmentSessionDetail)
def finish_assessment_session(
    session_id: str,
    _: FinishAssessmentRequest | None = None,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> AssessmentSessionDetail:
    session = session_for_user(db, session_id, current_user)
    return finish_session(db, session)
