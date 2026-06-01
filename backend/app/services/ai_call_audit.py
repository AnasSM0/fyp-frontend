from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterator


logger = logging.getLogger(__name__)


@dataclass
class AICallRecord:
    ai_call_id: str
    purpose: str
    provider: str
    model: str
    endpoint_path: str
    prompt_char_count: int = 0
    estimated_payload_size_chars: int = 0
    session_id: str | None = None
    question_count: int | None = None
    answer_count: int | None = None
    started_at: str = ""
    duration_ms: int | None = None
    status_code: int | None = None
    success: bool = False
    failure_reason: str | None = None
    retry_after_seconds: int | None = None


@dataclass
class ReportAICallAudit:
    report_generation_id: str
    session_id: str
    max_ai_calls: int
    records: list[AICallRecord] = field(default_factory=list)
    status: str = "started"
    reason: str | None = None

    @property
    def total_ai_calls(self) -> int:
        return len(self.records)

    @property
    def prompt_chars(self) -> int:
        return sum(record.prompt_char_count for record in self.records)

    def count_provider(self, provider: str) -> int:
        return sum(1 for record in self.records if record.provider == provider)

    def count_purpose(self, purpose: str) -> int:
        return sum(1 for record in self.records if record.purpose == purpose)


_CURRENT_REPORT_AUDIT: ContextVar[ReportAICallAudit | None] = ContextVar(
    "current_report_ai_call_audit",
    default=None,
)


def classify_ai_failure(exc: Exception | None = None, status_code: int | None = None) -> str:
    text = str(exc or "").lower()
    if status_code == 429 or "429" in text or "rate_limited" in text or "quota" in text:
        return "rate_limited"
    if "timeout" in text or "timed out" in text:
        return "timeout"
    if "malformed" in text or "json" in text:
        return "malformed_output"
    if status_code in {401, 403} or "auth" in text or "unauthorized" in text:
        return "auth_error"
    if status_code:
        return "provider_error"
    if "missing api key" in text or "api key missing" in text:
        return "missing_api_key"
    return "unknown"


@contextmanager
def report_ai_audit(session_id: str, max_ai_calls: int) -> Iterator[ReportAICallAudit]:
    audit = ReportAICallAudit(
        report_generation_id=str(uuid.uuid4()),
        session_id=session_id,
        max_ai_calls=max_ai_calls,
    )
    token = _CURRENT_REPORT_AUDIT.set(audit)
    try:
        yield audit
    finally:
        _CURRENT_REPORT_AUDIT.reset(token)


def current_report_audit() -> ReportAICallAudit | None:
    return _CURRENT_REPORT_AUDIT.get()


def start_ai_call(
    *,
    purpose: str,
    provider: str,
    model: str,
    endpoint_path: str,
    prompt_char_count: int = 0,
    estimated_payload_size_chars: int = 0,
    session_id: str | None = None,
    question_count: int | None = None,
    answer_count: int | None = None,
) -> tuple[AICallRecord, float]:
    audit = current_report_audit()
    record = AICallRecord(
        ai_call_id=str(uuid.uuid4()),
        purpose=purpose,
        provider=provider,
        model=model,
        endpoint_path=endpoint_path,
        prompt_char_count=prompt_char_count,
        estimated_payload_size_chars=estimated_payload_size_chars,
        session_id=session_id or (audit.session_id if audit else None),
        question_count=question_count,
        answer_count=answer_count,
        started_at=datetime.now(timezone.utc).isoformat(),
    )
    if audit:
        audit.records.append(record)
    logger.info(
        "[AI_CALL_START] id=%s purpose=%s provider=%s model=%s endpoint=%s session=%s "
        "question_count=%s answer_count=%s prompt_chars=%s payload_chars=%s started_at=%s",
        record.ai_call_id,
        purpose,
        provider,
        model,
        endpoint_path,
        record.session_id,
        question_count,
        answer_count,
        prompt_char_count,
        estimated_payload_size_chars,
        record.started_at,
    )
    return record, time.perf_counter()


def end_ai_call(
    record: AICallRecord,
    started_perf: float,
    *,
    success: bool,
    status_code: int | None = None,
    failure_reason: str | None = None,
    retry_after_seconds: int | None = None,
) -> None:
    record.duration_ms = int((time.perf_counter() - started_perf) * 1000)
    record.success = success
    record.status_code = status_code
    record.failure_reason = failure_reason
    record.retry_after_seconds = retry_after_seconds
    logger.info(
        "[AI_CALL_END] id=%s purpose=%s provider=%s model=%s endpoint=%s session=%s "
        "status=%s duration_ms=%s success=%s reason=%s retry_after=%s",
        record.ai_call_id,
        record.purpose,
        record.provider,
        record.model,
        record.endpoint_path,
        record.session_id,
        status_code,
        record.duration_ms,
        success,
        failure_reason,
        retry_after_seconds,
    )


def log_live_embedding_blocked(*, provider: str, model: str, purpose: str, caller: str) -> None:
    logger.warning(
        "[LIVE_EMBEDDING_BLOCKED] provider=%s model=%s purpose=%s caller=%s",
        provider,
        model,
        purpose,
        caller,
    )


def log_report_ai_summary(audit: ReportAICallAudit, *, status: str, reason: str | None = None) -> None:
    audit.status = status
    audit.reason = reason
    if audit.total_ai_calls > audit.max_ai_calls:
        logger.error(
            "[REPORT_AI_SUMMARY] session=%s report_generation_id=%s total_ai_calls=%s "
            "gemini_calls=%s embedding_calls=%s openrouter_calls=%s nvidia_calls=%s "
            "prompt_chars=%s status=%s reason=%s max_ai_calls=%s",
            audit.session_id,
            audit.report_generation_id,
            audit.total_ai_calls,
            audit.count_provider("gemini"),
            audit.count_purpose("embedding"),
            audit.count_provider("openrouter"),
            audit.count_provider("nvidia"),
            audit.prompt_chars,
            status,
            reason,
            audit.max_ai_calls,
        )
        return
    logger.info(
        "[REPORT_AI_SUMMARY] session=%s report_generation_id=%s total_ai_calls=%s "
        "gemini_calls=%s embedding_calls=%s openrouter_calls=%s nvidia_calls=%s "
        "prompt_chars=%s status=%s reason=%s",
        audit.session_id,
        audit.report_generation_id,
        audit.total_ai_calls,
        audit.count_provider("gemini"),
        audit.count_purpose("embedding"),
        audit.count_provider("openrouter"),
        audit.count_provider("nvidia"),
        audit.prompt_chars,
        status,
        reason,
    )
