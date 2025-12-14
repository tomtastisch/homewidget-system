from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.utils import auth as auth_utils

pytestmark = pytest.mark.integration


def test_feed_requires_auth(client: TestClient) -> None:
    """Der /api/home/feed Endpunkt erfordert Authentifizierung."""
    assert client.get("/api/home/feed").status_code == 401


def test_feed_shows_user_widgets_after_registration(client: TestClient) -> None:
    """Nach der Registrierung zeigt der Feed die Widgets des Benutzers."""
    # Registrieren und anmelden
    resp = auth_utils.register_and_login(client, "testuser@example.com", "Secret1234!")
    assert resp.status_code == 200
    access_token = resp.json()["access_token"]

    # Ein Widget für den Benutzer erstellen
    widget_resp = client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(access_token),
        json={"name": "Test Widget", "config_json": '{"type": "banner"}'},
    )
    assert widget_resp.status_code == 201
    widget_data = widget_resp.json()

    # Feed abrufen
    feed_resp = client.get(
        "/api/home/feed",
        headers=auth_utils.auth_headers(access_token),
    )
    assert feed_resp.status_code == 200
    feed_data = feed_resp.json()

    # Überprüfen, dass das Widget im Feed vorhanden ist
    assert len(feed_data) == 1
    assert feed_data[0]["id"] == widget_data["id"]
    assert feed_data[0]["name"] == "Test Widget"


def test_feed_is_user_scoped(client: TestClient) -> None:
    """Der Feed zeigt nur die Widgets des aktuellen Benutzers."""
    # User A
    a_resp = auth_utils.register_and_login(client, "userA@example.com", "Secret1234!")
    a_access = a_resp.json()["access_token"]

    # User B
    b_resp = auth_utils.register_and_login(client, "userB@example.com", "Secret1234!")
    b_access = b_resp.json()["access_token"]

    # A erstellt 2 Widgets
    for i in range(2):
        client.post(
            "/api/widgets/",
            headers=auth_utils.auth_headers(a_access),
            json={"name": f"Widget A{i}", "config_json": "{}"},
        )

    # B erstellt 1 Widget
    client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(b_access),
        json={"name": "Widget B0", "config_json": "{}"},
    )

    # A sieht 2 Widgets im Feed
    a_feed = client.get("/api/home/feed", headers=auth_utils.auth_headers(a_access))
    assert a_feed.status_code == 200
    assert len(a_feed.json()) == 2
    for widget in a_feed.json():
        assert widget["name"].startswith("Widget A")

    # B sieht 1 Widget im Feed
    b_feed = client.get("/api/home/feed", headers=auth_utils.auth_headers(b_access))
    assert b_feed.status_code == 200
    assert len(b_feed.json()) == 1
    assert b_feed.json()[0]["name"] == "Widget B0"


def test_feed_empty_for_user_with_no_widgets(client: TestClient) -> None:
    """Ein neuer Benutzer ohne Widgets sieht einen leeren Feed."""
    resp = auth_utils.register_and_login(client, "empty@example.com", "Secret1234!")
    assert resp.status_code == 200
    access_token = resp.json()["access_token"]

    feed_resp = client.get(
        "/api/home/feed",
        headers=auth_utils.auth_headers(access_token),
    )
    assert feed_resp.status_code == 200
    assert feed_resp.json() == []


def test_feed_after_widget_deletion(client: TestClient) -> None:
    """Der Feed wird aktualisiert, nachdem ein Widget gelöscht wird."""
    resp = auth_utils.register_and_login(client, "deleter@example.com", "Secret1234!")
    access_token = resp.json()["access_token"]

    # Widget erstellen
    widget_resp = client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(access_token),
        json={"name": "To Delete", "config_json": "{}"},
    )
    widget_id = widget_resp.json()["id"]

    # Feed sollte 1 Widget enthalten
    feed1 = client.get("/api/home/feed", headers=auth_utils.auth_headers(access_token))
    assert len(feed1.json()) == 1

    # Widget löschen
    delete_resp = client.delete(
        f"/api/widgets/{widget_id}",
        headers=auth_utils.auth_headers(access_token),
    )
    assert delete_resp.status_code == 204

    # Feed sollte jetzt leer sein
    feed2 = client.get("/api/home/feed", headers=auth_utils.auth_headers(access_token))
    assert feed2.status_code == 200
    assert feed2.json() == []
