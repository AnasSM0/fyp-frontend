from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.marketplace import ActivityFeedResponse
from app.services.activity_service import activity_feed_for_user

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/me", response_model=ActivityFeedResponse)
def get_my_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActivityFeedResponse:
    return activity_feed_for_user(db, current_user)
