from __future__ import annotations

"""Sicherheitsrelevante Tests für Widget-Endpunkte.

Prüft Authentifizierungspflicht, Mandantentrennung (Ownership) und
fehlerhafte Zugriffe.
"""

import pytest
from fastapi.testclient import TestClient

from tests.utils import auth as auth_utils

pytestmark = pytest.mark.integration


def test_widgets_requires_auth(client: TestClient) -> None:
    """Alle Widget-Endpunkte müssen ein gültiges Access-Token verlangen."""
    assert client.get("/api/widgets/").status_code == 401
    assert client.post("/api/widgets/", json={"name": "x", "config_json": "{}"}).status_code == 401
    assert client.delete("/api/widgets/123").status_code == 401


def test_create_and_list_widgets_are_scoped_to_user(client: TestClient) -> None:
    """Jeder Benutzer sieht nur seine eigenen Widgets."""
    # User A
    a_access = auth_utils.register_and_login(client, "userA@example.com", "Secret1234!").json()["access_token"]
    # User B
    b_access = auth_utils.register_and_login(client, "userB@example.com", "Secret1234!").json()["access_token"]

    # A legt zwei Widgets an
    for i in range(2):
        resp = client.post(
            "/api/widgets/",
            headers=auth_utils.auth_headers(a_access),
            json={"name": f"A{i}", "config_json": "{}"},
        )
        assert resp.status_code == 201

    # B legt ein Widget an
    resp_b = client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(b_access),
        json={"name": "B0", "config_json": "{}"},
    )
    assert resp_b.status_code == 201

    # A sieht 2 Widgets
    list_a = client.get("/api/widgets/", headers=auth_utils.auth_headers(a_access))
    assert list_a.status_code == 200
    assert len(list_a.json()) == 2

    # B sieht 1 Widget
    list_b = client.get("/api/widgets/", headers=auth_utils.auth_headers(b_access))
    assert list_b.status_code == 200
    assert len(list_b.json()) == 1


def test_delete_widget_only_by_owner(client: TestClient) -> None:
    """Nur der Owner darf sein Widget löschen; andere sehen 404 (nicht gefunden)."""
    a_access = auth_utils.register_and_login(client, "owner@example.com", "Secret1234!").json()["access_token"]
    b_access = auth_utils.register_and_login(client, "other@example.com", "Secret1234!").json()["access_token"]

    created = client.post(
        "/api/widgets/",
        headers=auth_utils.auth_headers(a_access),
        json={"name": "Owned", "config_json": "{}"},
    )
    assert created.status_code == 201
    widget_id = created.json()["id"]

    # Fremder Nutzer bekommt 404 (absichtliche Informationsarmut)
    forbidden = client.delete(
        f"/api/widgets/{widget_id}",
        headers=auth_utils.auth_headers(b_access),
    )
    assert forbidden.status_code == 404

    # Owner kann löschen
    ok = client.delete(
        f"/api/widgets/{widget_id}",
        headers=auth_utils.auth_headers(a_access),
    )
    assert ok.status_code == 204
