from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.marketplace import ActivityEvent
from app.models.user import User
from app.schemas.marketplace import ActivityEventRead, ActivityFeedResponse


def create_activity(
    db: Session,
    *,
    user_id: str,
    actor_user_id: str | None,
    event_type: str,
    title: str,
    description: str,
    entity_type: str,
    entity_id: str,
    metadata: dict | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        user_id=user_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        title=title,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    db.add(event)
    return event


def activity_feed_for_user(db: Session, user: User) -> ActivityFeedResponse:
    rows = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.user_id == user.id)
        .order_by(desc(ActivityEvent.created_at))
        .limit(50)
    ).all()
    return ActivityFeedResponse(items=[ActivityEventRead.model_validate(row) for row in rows])
