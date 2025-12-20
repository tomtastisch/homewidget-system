from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.homewidget.contracts.v1.widget_contracts import FeedPageV1, WidgetContractV1
from tests.utils import auth as auth_utils

pytestmark = pytest.mark.integration


def test_feed_v1_uses_real_when_non_empty(client: TestClient, monkeypatch) -> None:
    # Arrange: Login
    login_resp = auth_utils.register_and_login(client, "realfeed@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Patch Real-Quelle: liefert 2 Elemente mit IDs außerhalb der Fixture-Range 1001–1003
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

    # Act
    resp = client.get("/api/home/feed_v1", headers=auth_utils.auth_headers(token))
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: enthält ausschließlich Real‑IDs, keine Fixture‑IDs 1001–1003
    ids = [it["id"] for it in data["items"]]
    assert ids and all(i not in (1001, 1002, 1003) for i in ids)


def test_feed_v1_falls_back_to_fixtures_on_empty(client: TestClient, monkeypatch) -> None:
    # Arrange: Login
    login_resp = auth_utils.register_and_login(client, "emptyfeed@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Patch Real-Quelle: liefert leere Seite
    def fake_real_empty(cursor: int = 0, limit: int = 20) -> FeedPageV1:
        return FeedPageV1(items=[], next_cursor=None)

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_feed_v1",
        fake_real_empty,
        raising=True,
    )

    # Act
    resp = client.get(
        "/api/home/feed_v1",
        params={"limit": 3, "cursor": 0},
        headers=auth_utils.auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: deterministische Fixtures
    ids = [it["id"] for it in data["items"]]
    assert ids == [1003, 1002, 1001]


def test_feed_v1_falls_back_to_fixtures_on_exception(client: TestClient, monkeypatch) -> None:
    # Arrange: Login
    login_resp = auth_utils.register_and_login(client, "exfeed@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Patch Real-Quelle: wirft Fehler
    def fake_real_raises(cursor: int = 0, limit: int = 20) -> FeedPageV1:  # type: ignore[override]
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_feed_v1",
        fake_real_raises,
        raising=True,
    )

    # Act
    resp = client.get(
        "/api/home/feed_v1",
        params={"limit": 2, "cursor": 0},
        headers=auth_utils.auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: Fixtures (nicht leer)
    ids = [it["id"] for it in data["items"]]
    assert ids and set(ids).issubset({1001, 1002, 1003})


def test_detail_v1_fixture_case_is_valid(client: TestClient, monkeypatch) -> None:
    # Arrange: Real‑Quelle leer, damit wir sicher im Fixture‑Modus sind
    login_resp = auth_utils.register_and_login(client, "detailfixture@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    def fake_real_empty(cursor: int = 0, limit: int = 20) -> FeedPageV1:
        return FeedPageV1(items=[], next_cursor=None)

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_feed_v1",
        fake_real_empty,
        raising=True,
    )

    # Act: Fixture‑Detail anfragen (1003) über die unauth Demo‑Route
    resp = client.get(
        "/api/home/demo/widgets/1003/detail_v1",
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: Struktur und Blöcke
    assert data["id"] == 1003
    assert isinstance(data.get("container"), dict)
    content = data.get("content_spec")
    assert isinstance(content, dict)
    assert content.get("kind") == "blocks"
    assert isinstance(content.get("blocks"), list) and len(content["blocks"]) >= 1


# Hilfsfunktion: dynamische Zeitstempel relativ zu jetzt
from tests.utils.time import TimeUtil


def items_ts(days: int) -> datetime:
    t = TimeUtil()
    return t.future(days=days)
