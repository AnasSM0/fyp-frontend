import logging

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import require_candidate
from app.db.session import get_db
from app.models.user import User
from app.schemas.evaluation import (
    CoachReportRequest,
    CoachReportResponse,
    EvaluationReportDetail,
    GenerateReportRequest,
    PublishReportResponse,
)
from app.services.evaluation_service import (
    coach_report_for_user,
    generate_report_for_user,
    get_report_by_session_for_user,
    get_report_for_user,
    latest_report_for_user,
    publish_report,
    report_detail,
)
from app.core.config import get_settings
from app.services.ai_provider_factory import normalize_provider_name

router = APIRouter(prefix="/evaluations", tags=["evaluations"])
logger = logging.getLogger(__name__)


@router.post("/sessions/{session_id}/generate", response_model=EvaluationReportDetail)
def generate_report(
    session_id: str,
    payload: GenerateReportRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> EvaluationReportDetail:
    settings = get_settings()
    requested = normalize_provider_name(x_ai_provider)
    selected = requested or normalize_provider_name(settings.default_ai_provider)
    logger.info(
        "[REPORT_GENERATE_PROVIDER_SELECTION] session_id=%s x_ai_provider=%s default_provider=%s selected_provider=%s",
        session_id,
        requested or "",
        settings.default_ai_provider,
        selected or "",
    )
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


@router.get("/reports/session/{session_id}/debug")
def get_report_debug_for_session(
    session_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> dict:
    report = get_report_by_session_for_user(db, session_id, current_user)
    report_json = report.report_json or {}
    timing = report_json.get("generation_timing_ms") or {}
    provider_performance = report_json.get("provider_performance") or {}
    provider_metadata = report_json.get("provider_metadata") or {}
    return {
        "session_id": report.session_id,
        "report_id": report.id,
        "prompt_build_ms": timing.get("prompt_build_ms", 0),
        "rubric_retrieval_ms": timing.get("rubric_retrieval_ms", 0),
        "provider_request_ms": timing.get("provider_request_ms", 0),
        "response_parse_ms": timing.get("response_parse_ms", 0),
        "json_validation_ms": timing.get("json_validation_ms", 0),
        "report_save_ms": timing.get("report_save_ms", 0),
        "total_generation_ms": timing.get("total_generation_ms", 0),
        "prompt_chars_before": report_json.get("prompt_chars_before"),
        "prompt_chars_after": report_json.get("prompt_chars_after"),
        "rubrics_requested": report_json.get("rubrics_requested"),
        "rubrics_used": report_json.get("rubrics_used"),
        "provider": provider_performance.get("provider") or provider_metadata.get("actual_provider"),
        "model": provider_performance.get("model") or provider_metadata.get("model"),
        "provider_performance": provider_performance,
        "batch_payload_size_summary": report_json.get("batch_payload_size_summary"),
        "rubric_retrieval_summary": report_json.get("rubric_retrieval_summary"),
        "provider_metadata": provider_metadata,
        "ai_call_summary": report_json.get("ai_call_summary"),
    }


@router.get("/reports/{report_id}", response_model=EvaluationReportDetail)
def get_report(
    report_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> EvaluationReportDetail:
    return report_detail(get_report_for_user(db, report_id, current_user))


@router.post("/reports/{report_id}/coach", response_model=CoachReportResponse)
def coach_evaluation_report(
    report_id: str,
    payload: CoachReportRequest,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
    x_ai_provider: str | None = Header(default=None, alias="X-AI-Provider"),
) -> CoachReportResponse:
    report = get_report_for_user(db, report_id, current_user)
    return coach_report_for_user(report, payload, provider_name=x_ai_provider)


@router.post("/reports/{report_id}/publish", response_model=PublishReportResponse)
def publish_evaluation_report(
    report_id: str,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> PublishReportResponse:
    report = get_report_for_user(db, report_id, current_user)
    return PublishReportResponse(report=report_detail(publish_report(db, report)))
