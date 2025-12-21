"""Unauthentifizierte Demo-Endpunkte (v1) für Feed und Widget-Detail.

Pfadpräfix: /api/home/demo

Policy:
- Feed: real-first; wenn real leer/Exception -> deterministische Fixtures
- Detail: Fixtures nur für reservierte Fixture-ID-Range; sonst real; sonst 404
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from ...core.logging_config import get_logger
from ...homewidget.contracts.v1.widget_contracts import FeedPageV1, WidgetDetailV1
from ...services.demo_v1_service import build_demo_feed_page_v1, resolve_demo_detail_v1

router = APIRouter(prefix="/api/home/demo", tags=["home-demo"])
LOG = get_logger("api.home.demo")


@router.get("/feed_v1", response_model=FeedPageV1)
def get_demo_feed_v1(request: Request, cursor: int = 0, limit: int = 20) -> FeedPageV1:
    """Versionierter Demo-Feed v1 (unauth), real-first mit Fixture-Fallback."""
    return build_demo_feed_page_v1(cursor=cursor, limit=limit)


@router.get("/widgets/{widget_id}/detail_v1", response_model=WidgetDetailV1)
def get_demo_widget_detail_v1(widget_id: int) -> WidgetDetailV1:
    """Detail-Endpoint (unauth) für Demo-Clients mit Range-basierter Fixture-Policy."""
    detail = resolve_demo_detail_v1(widget_id)
    if detail is None:
        LOG.info("demo_detail_v1_not_found", extra={"widget_id": widget_id})
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget detail not found")
    return detail
