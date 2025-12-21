"""
Patchbare Real-Quelle für Demo‑Feed v1.

Standard‑Implementierung liefert keine Daten, damit Tests/Dev per Monkeypatch
deterministische Real‑Daten einspeisen können.
"""
from __future__ import annotations

from typing import Optional

from ..homewidget.providers.aggregator import ProvidersAggregator
from ..homewidget.providers.furniture_provider import FurnitureProvider
from ..homewidget.providers.mobile_plans_provider import MobilePlansProvider
from ..homewidget.contracts.v1.widget_contracts import FeedPageV1, WidgetDetailV1


def load_real_demo_feed_v1(cursor: int = 0, limit: int = 20) -> FeedPageV1:
    """
    Liefert echte Demo‑Widgets (v1 Contract) mit Cursor/Limit über den Aggregator.

    Fail‑open: Fehler einzelner Provider werden geloggt und führen nicht zu 500.
    """
    aggregator = ProvidersAggregator(
        providers=[
            MobilePlansProvider(),
            FurnitureProvider(),
        ]
    )
    return aggregator.load_page(cursor=cursor, limit=limit)


def load_real_demo_widget_detail_v1(widget_id: int) -> Optional[WidgetDetailV1]:
    """
    Liefert das Detail zu einer echten Demo‑Widget‑ID.

    Default: None (nicht gefunden). In Tests kann diese Funktion gepatcht werden.
    """
    return None
