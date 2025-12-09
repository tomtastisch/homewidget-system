from __future__ import annotations
"""
Integrationstests für die Auth‑Endpunkte. Diese Datei testet vorrangig den
Refresh‑Token‑Flow sowie den Zugriff auf den geschützten /auth/me‑Endpunkt.
Registrierungs‑ und Login‑Szenarien befinden sich in den spezifischen
Testmodulen test_register und test_login.
"""

import pytest
from fastapi.testclient import TestClient
from freezegun import freeze_time
from datetime import UTC, datetime, timedelta
from app.core.config import settings
from collections.abc import Callable
from typing import Any, Protocol

pytestmark = pytest.mark.integration



class ResponseLike(Protocol):
    status_code: int

    def json(self) -> Any:  # pragma: no cover - Protocol typing helper
        """Parst und liefert den JSON-Body der Antwort."""


LoginUserFixture = Callable[[str, str], ResponseLike]
RegisterUserFixture = Callable[[str, str], dict[str, Any]]


def test_refresh_token_flow(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    """Prüft den Refresh-Flow über POST /auth/refresh mit gültigem Refresh-Token."""
    # Benutzer registrieren und einloggen, um Tokens zu erhalten
    register_user("refresh@example.com", "SecurePassword123!")
    login_data = login_user("refresh@example.com", "SecurePassword123!").json()
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
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalid-token-12345"},
    )

    assert response.status_code == 401


def test_refresh_token_reuse_denied(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    """Stellt sicher, dass ein alter Refresh-Token nach Rotation nicht erneut verwendet werden kann (401)."""
    # Benutzer registrieren und einloggen, um Tokens zu erhalten
    register_user("reuse@example.com", "SecurePassword123!")
    login_data = login_user("reuse@example.com", "SecurePassword123!").json()
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


def test_refresh_with_expired_token_returns_401(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    """Abgelaufene Refresh-Tokens werden von der API mit 401 abgelehnt."""
    register_user("expired-refresh@example.com", "SecurePassword123!")
    login_data = login_user("expired-refresh@example.com", "SecurePassword123!").json()
    refresh_token = login_data["refresh_token"]

    # Zeit über das konfigurierte Refresh-Token-Ablaufdatum hinaus vorspulen
    future = datetime.now(tz=UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS + 1)
    with freeze_time(future, tz_offset=0):
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 401




def test_me_endpoint_with_valid_token(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    """Prüft /auth/me mit gültigem Access-Token."""
    # Registrieren und einloggen
    register_user("me@example.com", "SecurePassword123!")
    login_data = login_user("me@example.com", "SecurePassword123!").json()
    access_token = login_data["access_token"]

    # /auth/me mit Token aufrufen
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    assert response.status_code == 200

    data = response.json()
    assert data["email"] == "me@example.com"
    assert "id" in data
    assert "password" not in data


def test_me_endpoint_without_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_endpoint_with_invalid_token(client: TestClient) -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token-12345"},
    )

    assert response.status_code == 401
