"""
Zentralisierte Demo-v1-Policy (Feed & Detail) mit konsistentem Logging.

Policy:
- Feed: real-first; invalid drop; wenn leer/Exception -> deterministische Fixtures
- Detail: Fixtures nur in reservierter Range; sonst Real; invalid -> None
"""
from __future__ import annotations

from typing import Optional

from . import demo_feed_real_source as real_src
from ..core.logging_config import get_logger
from ..fixtures.v1 import get_detail, get_feed_page, is_fixture_id
from ..schemas.v1.widget_contracts import FeedPageV1, WidgetDetailV1

LOG = get_logger("service.demo_v1")


def build_demo_feed_page_v1(cursor: int = 0, limit: int = 20) -> FeedPageV1:
    """Baut die Demo-Feed-Seite gemäß real-first Policy."""
    try:
        real_page = real_src.load_real_demo_feed_v1(cursor=cursor, limit=limit)
        # Strikte Validierung ist bereits über Pydantic-Models gewährleistet; dennoch sicherstellen
        if real_page and real_page.items:
            LOG.info("demo_feed_v1_real_delivered", extra={"count": len(real_page.items)})
            return real_page
        LOG.info("demo_feed_v1_real_empty_fallback_to_fixtures")
    except Exception as exc:  # noqa: BLE001
        LOG.warning("demo_feed_v1_real_exception_fallback_to_fixtures", extra={"error": str(exc)})

    page = get_feed_page(cursor=cursor, limit=limit)
    LOG.info("demo_feed_v1_fixture_delivered", extra={"count": len(page.items)})
    return page


def resolve_demo_detail_v1(widget_id: int) -> Optional[WidgetDetailV1]:
    """Löst das Detail gemäß Demo-Policy auf. Gibt None zurück, wenn nicht vorhanden/invalid."""
    # 1) Fixture-Range bevorzugt als Demo-Fallback
    if is_fixture_id(widget_id):
        detail = get_detail(widget_id)
        if detail:
            LOG.info("demo_detail_v1_fixture_delivered", extra={"widget_id": widget_id})
            return detail
        return None

    # 2) Real versuchen, invalid -> None
    try:
        real_detail = real_src.load_real_demo_widget_detail_v1(widget_id)
    except Exception as exc:  # noqa: BLE001
        LOG.warning("demo_detail_v1_real_exception", extra={"widget_id": widget_id, "error": str(exc)})
        real_detail = None

    if real_detail is None:
        return None

    # Validität zusätzlich absichern (re-parse), falls Quelle keine strikte Typen erzwingt
    try:
        parsed = WidgetDetailV1.model_validate(real_detail)
    except Exception as exc:  # noqa: BLE001
        LOG.warning(
            "demo_detail_v1_real_invalid",
            extra={"widget_id": widget_id, "error": str(exc)},
        )
        return None

    LOG.info("demo_detail_v1_real_delivered", extra={"widget_id": widget_id})
    return parsed
