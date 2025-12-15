from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.schemas.v1.widget_contracts import (
    ContentBlockV1,
    ContentSpecV1,
    FeedPageV1,
    WidgetContractV1,
    WidgetDetailV1,
)

pytestmark = pytest.mark.integration


def test_demo_feed_v1_unauth_uses_real_when_non_empty(client: TestClient, monkeypatch) -> None:
    # Patch Real-Quelle: liefert 2 Elemente mit IDs außerhalb der Fixture-Range 1001–1999
    def fake_real(cursor: int = 0, limit: int = 20) -> FeedPageV1:
        items = [
            WidgetContractV1(id=2001, name="RealA", priority=50, created_at=items_ts(5)),
            WidgetContractV1(id=2002, name="RealB", priority=40, created_at=items_ts(4)),
        ]
        return FeedPageV1(items=items, next_cursor=None)

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_feed_v1",
        fake_real,
        raising=True,
    )

    # Act (ohne Auth Header)
    resp = client.get("/api/home/demo/feed_v1")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: enthält ausschließlich Real‑IDs, keine Fixture‑IDs 1001–1999
    ids = [it["id"] for it in data["items"]]
    assert ids and all(i < 1001 or i > 1999 for i in ids)


def test_demo_feed_v1_unauth_falls_back_to_fixtures_on_empty(client: TestClient, monkeypatch) -> None:
    # Patch Real-Quelle: liefert leere Seite
    def fake_real_empty(cursor: int = 0, limit: int = 20) -> FeedPageV1:
        return FeedPageV1(items=[], next_cursor=None)

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_feed_v1",
        fake_real_empty,
        raising=True,
    )

    # Act (ohne Auth Header)
    resp = client.get("/api/home/demo/feed_v1", params={"limit": 3, "cursor": 0})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: deterministische Fixtures
    ids = [it["id"] for it in data["items"]]
    assert ids == [1003, 1002, 1001]


def test_demo_detail_v1_fixture_range_only_uses_fixtures(client: TestClient, monkeypatch) -> None:
    # Für ID in Fixture-Range muss Fixture zurückkommen (1003 existiert)
    resp = client.get("/api/home/demo/widgets/1003/detail_v1")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == 1003
    assert data["content_spec"]["kind"] == "blocks"
    assert isinstance(data["content_spec"]["blocks"], list) and data["content_spec"]["blocks"]


def test_demo_detail_v1_real_for_out_of_range_or_404(client: TestClient, monkeypatch) -> None:
    # Patch Real-Quelle für Detail
    def fake_real_detail(widget_id: int) -> WidgetDetailV1 | None:
        if widget_id == 2001:
            blocks = [
                ContentBlockV1(type="text", props={"text": "Hello"}),
            ]
            return WidgetDetailV1(
                id=2001,
                container={"title": "Real Detail", "description": "", "image_url": None},
                content_spec=ContentSpecV1(blocks=blocks),
            )
        return None

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_widget_detail_v1",
        fake_real_detail,
        raising=True,
    )

    # Act: Out-of-range -> Real vorhanden
    resp_ok = client.get("/api/home/demo/widgets/2001/detail_v1")
    assert resp_ok.status_code == 200, resp_ok.text
    assert resp_ok.json()["id"] == 2001

    # Act: Out-of-range und Real nicht vorhanden -> 404
    resp_404 = client.get("/api/home/demo/widgets/2002/detail_v1")
    assert resp_404.status_code == 404


# Hilfsfunktion: deterministische Zeitstempel
from datetime import datetime, timezone, timedelta


def items_ts(days: int) -> datetime:
    base = datetime(2024, 1, 10, 8, 0, 0, tzinfo=timezone.utc)
    return base + timedelta(days=days)
