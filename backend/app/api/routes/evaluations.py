from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import require_candidate
from app.db.session import get_db
from app.models.user import User
from app.schemas.evaluation import (
    EvaluationReportDetail,
    GenerateReportRequest,
    PublishReportResponse,
)
from app.services.evaluation_service import (
    generate_report_for_user,
    get_report_by_session_for_user,
    get_report_for_user,
    latest_report_for_user,
    publish_report,
    report_detail,
)

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.post("/sessions/{session_id}/generate", response_model=EvaluationReportDetail)
def generate_report(
    session_id: str,
    payload: GenerateReportRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> EvaluationReportDetail:
    report = generate_report_for_user(
        db,
        current_user,
        session_id,
        force_regenerate=payload.force_regenerate,
        provider_name=x_ai_provider,
    )
    return report_detail(report)


@router.get("/reports/me/latest", response_model=EvaluationReportDetail | None)
def get_latest_report(
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> EvaluationReportDetail | None:
    report = latest_report_for_user(db, current_user)
    return report_detail(report) if report is not None else None


@router.get("/reports/session/{session_id}", response_model=EvaluationReportDetail)
def get_report_for_session(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> EvaluationReportDetail:
    return report_detail(get_report_by_session_for_user(db, session_id, current_user))


@router.get("/reports/{report_id}", response_model=EvaluationReportDetail)
def get_report(
    report_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> EvaluationReportDetail:
    return report_detail(get_report_for_user(db, report_id, current_user))


@router.post("/reports/{report_id}/publish", response_model=PublishReportResponse)
def publish_evaluation_report(
    report_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> PublishReportResponse:
    report = get_report_for_user(db, report_id, current_user)
    return PublishReportResponse(report=report_detail(publish_report(db, report)))
