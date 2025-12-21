"""
Deterministische v1-Demo-Daten (Feed + Detail) als In-Memory-Fixtures.

Diese Fixtures dienen als stabile Grundlage für Frontend/Swift/Deploy.
Keine Random-/Zeitabhängigkeit; feste IDs, Zeiten und Reihenfolge.
"""
from __future__ import annotations

from datetime import datetime, timezone

from ..homewidget.contracts.v1.widget_contracts import (
    ContentBlockV1,
    ContentSpecV1,
    FeedPageV1,
    WidgetContractV1,
    WidgetDetailV1,
)

# Reservierte ID‑Range für Demo‑Fixtures (kollisionsfrei zu Real‑IDs halten)
FIXTURE_ID_MIN = 1001
FIXTURE_ID_MAX = 1999


def is_fixture_id(widget_id: int) -> bool:
    """Prüft, ob eine ID in der reservierten Fixture-Range liegt."""
    return FIXTURE_ID_MIN <= int(widget_id) <= FIXTURE_ID_MAX

# Feste Erstellungszeitpunkte (UTC)
_T0 = datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
_T1 = datetime(2024, 1, 2, 8, 0, 0, tzinfo=timezone.utc)
_T2 = datetime(2024, 1, 3, 8, 0, 0, tzinfo=timezone.utc)

# Feed-Teaser (deterministisch sortiert per priority desc, created_at desc, id desc)
FIXTURE_FEED: list[WidgetContractV1] = [
    WidgetContractV1(id=1003, name="Offers", priority=10, created_at=_T2),
    WidgetContractV1(id=1002, name="Welcome", priority=10, created_at=_T1),
    WidgetContractV1(id=1001, name="News", priority=5, created_at=_T0),
]


# Detail-Payloads (ContentSpec Blocks) zu den IDs oben
def _detail_for_1003() -> WidgetDetailV1:
    blocks: list[ContentBlockV1] = [
        ContentBlockV1(
            type="offer_grid",
            props={
                "title": "Top-Angebote",
                "items": [
                    {"sku": "SKU-001", "title": "Kaffeemaschine", "price": 49.99},
                    {"sku": "SKU-002", "title": "Wasserkocher", "price": 19.99},
                    {"sku": "SKU-003", "title": "Toaster", "price": 24.99},
                ],
            },
        )
    ]
    return WidgetDetailV1(
        id=1003,
        container={"title": "Deals der Woche", "description": "Spare jetzt.", "image_url": None},
        content_spec=ContentSpecV1(blocks=blocks),
    )


def _detail_for_1002() -> WidgetDetailV1:
    blocks: list[ContentBlockV1] = [
        ContentBlockV1(
            type="hero",
            props={
                "headline": "Willkommen zurück!",
                "subline": "Schön, dass du da bist.",
                "image_url": "https://example.com/hero.png",
            },
        ),
        ContentBlockV1(type="text", props={"text": "Hier sind deine heutigen Empfehlungen."}),
    ]
    return WidgetDetailV1(
        id=1002,
        container={"title": "Welcome", "description": "Startseite", "image_url": None},
        content_spec=ContentSpecV1(blocks=blocks),
    )


def _detail_for_1001() -> WidgetDetailV1:
    blocks: list[ContentBlockV1] = [
        ContentBlockV1(type="text", props={"text": "Neuigkeiten aus deinem Shop."}),
    ]
    return WidgetDetailV1(
        id=1001,
        container={"title": "News", "description": "Bleib auf dem Laufenden", "image_url": None},
        content_spec=ContentSpecV1(blocks=blocks),
    )


FIXTURE_DETAILS: dict[int, WidgetDetailV1] = {
    1003: _detail_for_1003(),
    1002: _detail_for_1002(),
    1001: _detail_for_1001(),
}


def get_feed_page(cursor: int = 0, limit: int = 20) -> FeedPageV1:
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    if cursor < 0:
        cursor = 0

    # FIXTURE_FEED ist bereits in Zielreihenfolge
    rows = FIXTURE_FEED[cursor: cursor + limit + 1]
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = cursor + limit if has_more else None
    return FeedPageV1(items=items, next_cursor=next_cursor)


def get_detail(widget_id: int) -> WidgetDetailV1 | None:
    return FIXTURE_DETAILS.get(widget_id)
