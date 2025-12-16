from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session

from ...api.deps import get_current_user
from ...config.timing_server_loader import get_feed_rate_rule
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...fixtures.v1 import get_feed_page
from ...schemas.v1.widget_contracts import FeedPageV1
from ...schemas.widget import WidgetRead
from ...services import demo_feed_real_source as real_src
from ...services.home_feed_service import HomeFeedService
from ...services.rate_limit import InMemoryRateLimiter, RateRule

router = APIRouter(prefix="/api/home", tags=["home"])
LOG = get_logger("api.home")

_rate_limiter = InMemoryRateLimiter()
_FEED_RULE_CACHE: RateRule | None = None
_FEED_RULE_CACHE_TS: float | None = None
# Warum genau 5 Sekunden TTL?
# - Maximale Verzögerung für Konfig-/Timing-Änderungen bleibt gering (≤ 5s),
#   d. h. Updates greifen quasi „sofort“ aus Sicht des Nutzers.
# - Der Endpoint wird sehr häufig aufgerufen; ein kurzer TTL-Cache reduziert
#   den Overhead (I/O/Parsing) von get_feed_rate_rule() signifikant, ohne die
#   Gefahr veralteter Regeln spürbar zu erhöhen.
# - Regel-/Konfig-Änderungen sind selten, daher ist 5s ein pragmatischer
#   Kompromiss zwischen Aktualität und Effizienz.
_FEED_RULE_TTL_SECONDS = 5.0


def _current_feed_rule() -> RateRule:
    """
    Liefert die aktuell gültige Rate-Rule.

    Hinweis: bewusst „lazy“ pro Request, damit Timing-/Config-Updates sofort greifen.
    """
    # kleiner TTL-Cache, um häufige Aufrufe zu entlasten
    import time

    global _FEED_RULE_CACHE, _FEED_RULE_CACHE_TS
    now = time.time()
    if _FEED_RULE_CACHE and _FEED_RULE_CACHE_TS and (now - _FEED_RULE_CACHE_TS) < _FEED_RULE_TTL_SECONDS:
        return _FEED_RULE_CACHE

    srv_rule = get_feed_rate_rule()
    rule = RateRule(count=srv_rule.count, window_seconds=srv_rule.window_seconds)
    _FEED_RULE_CACHE = rule
    _FEED_RULE_CACHE_TS = now
    return rule


def _enforce_rate_limit(*, key: str, event: str) -> None:
    """
    Erzwingt Rate-Limiting und wirft bei Überschreitung HTTP 429.
    """
    if not _rate_limiter.allow(key, _current_feed_rule()):
        LOG.warning(event)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
        )


@router.get("/feed", response_model=list[WidgetRead])
def get_feed(
        _request: Request,
        session: Session = Depends(get_session),
        user=Depends(get_current_user),
) -> list[WidgetRead]:
    """
    Liefert den BackendWidget-Feed für den aktuellen Benutzer.

    Rate-Limiting pro Benutzer-ID.
    """
    _enforce_rate_limit(key=f"feed:{user.id}", event="feed_rate_limited")

    LOG.debug("fetching_feed_for_user", extra={"user_email": user.email})
    widgets = HomeFeedService(session).get_user_widgets(user)
    # ORM -> Schema konvertieren, um genau list[WidgetRead] zurückzugeben
    widgets_read: list[WidgetRead] = [
        WidgetRead.model_validate(w, from_attributes=True) for w in widgets
    ]
    LOG.info("feed_delivered", extra={"count": len(widgets_read)})
    return widgets_read


@router.get("/feed_v1", response_model=FeedPageV1)
def get_feed_v1(
        _request: Request,
        cursor: Annotated[int, Query(ge=0)] = 0,
        limit: Annotated[int, Query(ge=1, le=100)] = 20,
        user=Depends(get_current_user),
) -> FeedPageV1:
    """
    Versionierter Feed v1 (read-only) mit stabiler Sortierung und Cursor-Pagination.

    Sortierung: priority desc, created_at desc, id desc
    Cursor: Offset (int). next_cursor wird gesetzt, wenn weitere Elemente existieren.
    """
    _enforce_rate_limit(key=f"feed_v1:{user.id}", event="feed_v1_rate_limited")

    try:
        real_page = real_src.load_real_demo_feed_v1(cursor=cursor, limit=limit)
        if real_page and real_page.items:
            LOG.info("feed_v1_real_delivered", extra={"count": len(real_page.items)})
            return real_page

        LOG.info("feed_v1_real_empty_fallback_to_fixtures")

    except Exception as exc:  # noqa: BLE001
        LOG.warning(
            "feed_v1_real_exception_fallback",
            extra={"error": str(exc)},
            exc_info=True,
        )

    page = get_feed_page(cursor=cursor, limit=limit)
    LOG.info("feed_v1_fixture_delivered", extra={"count": len(page.items)})
    return page