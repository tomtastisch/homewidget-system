from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_cache.decorator import cache
from sqlmodel import Session

from ...api.deps import get_current_user
from ...core.database import get_session
from ...services.home_feed_service import HomeFeedService
from ...services.rate_limit import InMemoryRateLimiter, parse_rule
from ...core.config import settings
from ...schemas.widget import WidgetRead


router = APIRouter(prefix="/api/home", tags=["home"])

rate_limiter = InMemoryRateLimiter()
feed_rule = parse_rule(settings.FEED_RATE_LIMIT)


@router.get("/feed", response_model=list[WidgetRead])
@cache(expire=30)
def get_feed(
    request: Request,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    # rate limit per user id
    key = f"feed:{user.id}"
    if not rate_limiter.allow(key, feed_rule):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
    service = HomeFeedService(session)
    widgets = service.get_user_widgets(user)
    return widgets
