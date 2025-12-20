from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.utils import auth as auth_utils

pytestmark = pytest.mark.integration


def _create_widget(client: TestClient, token: str, name: str, config_json: str = "{}") -> dict:
    resp = client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(token),
        json={"name": name, "config_json": config_json},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_feed_v1_pagination_and_ordering(client: TestClient) -> None:
    # Arrange: User registrieren und einloggen
    login_resp = auth_utils.register_and_login(client, "v1feed@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    access = login_resp.json()["access_token"]

    # Act: Erste Seite limit=2 (Aggregator-basierter Feed)
    page1 = client.get(
        "/api/home/feed_v1",
        params={"limit": 2, "cursor": 0},
        headers=auth_utils.auth_headers(access),
    )
    assert page1.status_code == 200, page1.text
    data1 = page1.json()
    assert "items" in data1 and isinstance(data1["items"], list)
    assert len(data1["items"]) == 2
    assert data1["next_cursor"] == 2

    # Reihenfolge ist deterministisch nach (priority desc, created_at desc, id desc)
    ids_page1 = [it["id"] for it in data1["items"]]
    # Demo-Provider liefern deterministisch: 2002, 2001 auf Seite 1
    assert ids_page1 == [2002, 2001]

    # Act: Zweite Seite (cursor=2)
    page2 = client.get(
        "/api/home/feed_v1",
        params={"limit": 2, "cursor": 2},
        headers=auth_utils.auth_headers(access),
    )
    assert page2.status_code == 200, page2.text
    data2 = page2.json()
    assert len(data2["items"]) >= 1
    assert data2["next_cursor"] is None

    # Vollständige ID-Menge aus Demo-Providern (4 Elemente)
    ids_page2 = [it["id"] for it in data2["items"]]
    all_ids = ids_page1 + ids_page2
    assert all_ids == [2002, 2001, 2102, 2101]

    # Determinismus: wiederholter Aufruf liefert gleiche Reihenfolge
    repeat = client.get(
        "/api/home/feed_v1",
        params={"limit": 3, "cursor": 0},
        headers=auth_utils.auth_headers(access),
    )
    assert repeat.status_code == 200
    assert [it["id"] for it in repeat.json()["items"]] == [2002, 2001, 2102]


def test_demo_widget_detail_v1_structure_unauth(client: TestClient) -> None:
    """
    Die öffentlichen Demo-Details liegen auf der unauth Route und liefern für
    die Fixture-IDs valide v1-Payloads.
    """
    # Act: Fixture-IDs prüfen (unauth)
    for wid in (1002, 1003, 1001):
        resp = client.get(f"/api/home/demo/widgets/{wid}/detail_v1")
        assert resp.status_code == 200, resp.text
        data = resp.json()

        # Assert: Container + ContentSpec vorhanden
        assert data["id"] == wid
        assert "container" in data and isinstance(data["container"], dict)
        assert "content_spec" in data and isinstance(data["content_spec"], dict)
        assert data["content_spec"].get("kind") == "blocks"
        assert isinstance(data["content_spec"].get("blocks"), list)
        assert len(data["content_spec"]["blocks"]) >= 1

    # Unbekannte ID (außerhalb Fixture-Range) -> 404
    resp_404 = client.get("/api/home/demo/widgets/9999/detail_v1")
    assert resp_404.status_code == 404


def test_auth_detail_v1_requires_ownership_and_no_fixtures(client: TestClient) -> None:
    # Arrange: User registrieren und einloggen
    login_resp = auth_utils.register_and_login(client, "ownercheck@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    access = login_resp.json()["access_token"]

    # Ein eigenes Widget anlegen
    created = _create_widget(client, access, name="My Widget")
    widget_id = created["id"]

    # Auth-Detail für Fixture-ID (nicht owned) -> 404
    resp_fixture_on_auth = client.get(
        "/api/widgets/1003/detail_v1", headers=auth_utils.auth_headers(access)
    )
    assert resp_fixture_on_auth.status_code == 404

    # Auth-Detail für eigenes Widget: Real-Quelle liefert per Default None -> 404
    resp_real_none = client.get(
        f"/api/widgets/{widget_id}/detail_v1", headers=auth_utils.auth_headers(access)
    )
    assert resp_real_none.status_code == 404


def test_demo_detail_v1_does_not_expose_real_widgets(client: TestClient) -> None:
    """
    Stelle sicher, dass per POST erstellte Widgets NICHT über den unauth Demo-Detail-Endpunkt
    abrufbar sind (Fixture-Isolation). Nur die reservierten Fixture-IDs sind dort erlaubt,
    ansonsten ggf. eine separate "Real"-Quelle – aber keine DB‑Widgets.
    """
    # Arrange: User registrieren und ein reales Widget erzeugen
    login_resp = auth_utils.register_and_login(client, "isolation@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    access = login_resp.json()["access_token"]

    created = _create_widget(client, access, name="Not For Demo")
    widget_id = created["id"]

    # Act: Unauth Demo-Detail mit dieser (realen) ID aufrufen
    resp = client.get(f"/api/home/demo/widgets/{widget_id}/detail_v1")

    # Assert: 404 – keine Vermischung mit dynamischen Daten
    assert resp.status_code == 404, resp.text


def test_auth_detail_v1_owned_widget_can_return_real_when_available(client: TestClient, monkeypatch) -> None:
    # Arrange: User + Widget
    login_resp = auth_utils.register_and_login(client, "ownreal@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    access = login_resp.json()["access_token"]
    created = _create_widget(client, access, name="Real Backed")
    widget_id = created["id"]

    # Patch Real-Quelle für genau diese ID
    from app.homewidget.contracts.v1.widget_contracts import WidgetDetailV1, ContentSpecV1, ContentBlockV1

    def fake_real_detail(wid: int) -> WidgetDetailV1 | None:  # type: ignore[override]
        if wid != widget_id:
            return None
        return WidgetDetailV1(
            id=wid,
            container={"title": "Owned", "description": "ok", "image_url": None},
            content_spec=ContentSpecV1(blocks=[ContentBlockV1(type="text", props={"text": "hello"})]),
        )

    monkeypatch.setattr(
        "app.services.demo_feed_real_source.load_real_demo_widget_detail_v1",
        fake_real_detail,
        raising=True,
    )

    # Act
    resp = client.get(f"/api/widgets/{widget_id}/detail_v1", headers=auth_utils.auth_headers(access))
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["id"] == widget_id
