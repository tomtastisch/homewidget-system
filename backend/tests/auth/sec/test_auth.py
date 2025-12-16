from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from freezegun import freeze_time

from tests.utils import auth as auth_utils
from tests.utils import timing as timing_utils

"""
Integrationstests für die Auth-Endpunkte.

Diese Datei testet vorrangig den Refresh-Token-Flow sowie den Zugriff auf den
geschützten /auth/me-Endpunkt. Registrierungs- und Login-Szenarien befinden
sich in den spezifischen Testmodulen test_register und test_login.
"""
pytestmark = pytest.mark.integration


def test_refresh_token_flow(client: TestClient) -> None:
    """Prüft den Refresh-Flow über POST /auth/refresh mit gültigem Refresh-Token."""
    # Benutzer registrieren und einloggen, um Tokens zu erhalten
    login_data = auth_utils.register_and_login(client, "refresh@example.com", "SecurePassword123!").json()
    refresh_token = login_data["refresh_token"]

    # Refresh-Token verwenden, um neue Tokens zu erhalten
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Neue Tokens müssen sich von den alten unterscheiden
    assert data["refresh_token"] != refresh_token


def test_refresh_token_invalid(client: TestClient) -> None:
    """Ungültiger Refresh-Token führt zu 401."""
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalid-token-12345"},
    )

    assert response.status_code == 401


def test_refresh_token_reuse_denied(client: TestClient) -> None:
    """
    Stellt sicher, dass ein alter Refresh-Token nach Rotation
    nicht erneut verwendet werden kann (401).
    """
    # Benutzer registrieren und einloggen, um Tokens zu erhalten
    login_data = auth_utils.register_and_login(client, "reuse@example.com", "SecurePassword123!").json()
    old_refresh = login_data["refresh_token"]

    # Erste Rotation ist erfolgreich
    response1 = client.post(
        "/api/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert response1.status_code == 200
    data1 = response1.json()
    new_refresh = data1["refresh_token"]
    assert new_refresh != old_refresh

    # Wiederverwendung des alten (revokierten) Tokens muss fehlschlagen
    response2 = client.post(
        "/api/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert response2.status_code == 401


def test_refresh_with_expired_token_returns_401(client: TestClient) -> None:
    """Abgelaufene Refresh-Tokens werden von der API mit 401 abgelehnt."""
    login_data = auth_utils.register_and_login(client, "expired-refresh@example.com", "SecurePassword123!").json()
    refresh_token = login_data["refresh_token"]

    # Zeit über das konfigurierte Refresh-Token-Ablaufdatum hinaus vorspulen
    future = datetime.now(tz=UTC) + timedelta(seconds=timing_utils.refresh_ttl_seconds() + 1)
    with freeze_time(future, tz_offset=0):
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

    assert response.status_code == 401


def test_me_endpoint_with_valid_token(client: TestClient) -> None:
    """Prüft /auth/me mit gültigem Access-Token."""
    # Registrieren und einloggen
    access_token = auth_utils.register_and_login(client, "me@example.com", "SecurePassword123!").json()["access_token"]

    # /auth/me mit Token aufrufen
    response = auth_utils.get_me(client, access_token)

    assert response.status_code == 200

    data = response.json()
    assert data["email"] == "me@example.com"
    assert "id" in data
    assert "password" not in data


def test_me_endpoint_without_token(client: TestClient) -> None:
    """/auth/me ohne Token führt zu 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_endpoint_with_invalid_token(client: TestClient) -> None:
    """/auth/me mit ungültigem Token führt zu 401."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token-12345"},
    )

    assert response.status_code == 401


def test_me_with_expired_access_token_returns_401(client: TestClient) -> None:
    """Abgelaufene Access-Tokens werden bei /auth/me mit 401 abgelehnt."""
    login_data = auth_utils.register_and_login(client, "expired-access@example.com", "SecurePassword123!").json()
    access_token = login_data["access_token"]

    future = datetime.now(tz=UTC) + timedelta(seconds=timing_utils.access_ttl_seconds() + 1)
    with freeze_time(future, tz_offset=0):
        resp = auth_utils.get_me(client, access_token)
    assert resp.status_code == 401
