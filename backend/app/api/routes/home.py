from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_cache.decorator import cache
from sqlmodel import Session

from ...api.deps import get_current_user
from ...core.config import settings
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...schemas.widget import WidgetRead
from ...services.home_feed_service import HomeFeedService
from ...services.rate_limit import InMemoryRateLimiter, parse_rule

router = APIRouter(prefix="/api/home", tags=["home"])
LOG = get_logger("api.home")

rate_limiter = InMemoryRateLimiter()
feed_rule = parse_rule(settings.FEED_RATE_LIMIT)

@router.get("/feed", response_model=list[WidgetRead])
@cache(expire=30)
def get_feed(
    _request: Request,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    # rate limit per user id
    key = f"feed:{user.id}"
    if not rate_limiter.allow(key, feed_rule):
        LOG.warning("feed_rate_limited")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")

    LOG.debug("fetching_feed_for_user", extra={"user_email": user.email})

    service = HomeFeedService(session)
    widgets = service.get_user_widgets(user)
    LOG.info("feed_delivered", extra={"count": len(widgets)})

    return widgets
