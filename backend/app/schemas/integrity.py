from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

IntegrityEventType = Literal[
    "TAB_HIDDEN",
    "WINDOW_BLUR",
    "WINDOW_FOCUS_LOST",
    "PASTE_ATTEMPT",
    "COPY_ATTEMPT",
    "RIGHT_CLICK",
    "FULLSCREEN_EXIT",
    "CAMERA_DENIED",
    "NO_FACE_DETECTED",
    "MULTIPLE_FACES_DETECTED",
    "FACE_AWAY",
    "EXCESSIVE_MOVEMENT",
    "LONG_INACTIVITY",
    "FAST_RESPONSE_ANOMALY",
]

IntegritySeverity = Literal["low", "medium", "high"]


class IntegrityEventCreate(BaseModel):
    session_id: str
    event_type: IntegrityEventType
    severity: IntegritySeverity | None = None
    details_json: dict = Field(default_factory=dict)
    duration_ms: int = Field(default=0, ge=0, le=24 * 60 * 60 * 1000)
    occurred_at: datetime | None = None


class IntegrityEventBatchCreate(BaseModel):
    events: list[IntegrityEventCreate] = Field(min_length=1, max_length=100)


class IntegrityEventRead(BaseModel):
    id: str
    session_id: str
    candidate_id: str
    event_type: str
    severity: str
    details_json: dict
    duration_ms: int
    occurred_at: datetime

    model_config = {"from_attributes": True}


class IntegrityBatchResponse(BaseModel):
    events: list[IntegrityEventRead]
    ignored_duplicates: int


class IntegritySummary(BaseModel):
    integrity_score: int
    risk_level: str
    summary: str
    events_by_type: dict[str, int]
    events_by_severity: dict[str, int]
    strongest_flags: list[dict]
    recommendation: str
    total_events: int
    total_duration_ms: int
    penalty_breakdown: dict[str, int]
