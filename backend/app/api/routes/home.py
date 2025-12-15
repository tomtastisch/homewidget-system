"""API-Endpunkte für Home-Feed und BackendWidget-Bereitstellung."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from ...api.deps import get_current_user
from ...core.config import settings
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...fixtures.v1 import get_feed_page
from ...schemas.v1.widget_contracts import FeedPageV1
from ...schemas.widget import WidgetRead
from ...services.home_feed_service import HomeFeedService
from ...services.rate_limit import InMemoryRateLimiter, parse_rule

router = APIRouter(prefix="/api/home", tags=["home"])
LOG = get_logger("api.home")

rate_limiter = InMemoryRateLimiter()
feed_rule = parse_rule(settings.FEED_RATE_LIMIT)

@router.get("/feed", response_model=list[WidgetRead])
def get_feed(
    _request: Request,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    """
    Ruft den BackendWidget-Feed für den aktuellen Benutzer ab.

    Rate-Limiting pro Benutzer-ID.
    """
    key = f"feed:{user.id}"
    if not rate_limiter.allow(key, feed_rule):
        LOG.warning("feed_rate_limited")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")

    LOG.debug("fetching_feed_for_user", extra={"user_email": user.email})

    service = HomeFeedService(session)
    widgets = service.get_user_widgets(user)
    LOG.info("feed_delivered", extra={"count": len(widgets)})

    return widgets


@router.get("/feed_v1", response_model=FeedPageV1)
def get_feed_v1(
        request: Request,
        cursor: int = 0,
        limit: int = 20,
        user=Depends(get_current_user),
):
    """
    Versionierter Feed v1 (read-only) mit stabiler Sortierung und Cursor-Pagination.

    Sortierung: priority desc, created_at desc, id desc
    Cursor: einfacher Offset (int). next_cursor wird gesetzt, wenn weitere Elemente existieren.
    """
    # Rate-Limit analog feed anwenden (pro User)
    key = f"feed_v1:{user.id}"
    if not rate_limiter.allow(key, feed_rule):
        LOG.warning("feed_v1_rate_limited")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")

    # Deterministische Fixtures liefern
    return get_feed_page(cursor=cursor, limit=limit)
