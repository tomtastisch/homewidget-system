from __future__ import annotations

from fastapi.testclient import TestClient
from freezegun import freeze_time
from datetime import UTC, datetime, timedelta
from app.core.config import settings
from collections.abc import Callable
from typing import Any, Protocol


# Common helpers are provided as fixtures (register_user, login_user) via conftest.py

class ResponseLike(Protocol):
    status_code: int

    def json(self) -> Any:  # pragma: no cover - Protocol typing helper
        """Parst und liefert den JSON-Body der Antwort."""


LoginUserFixture = Callable[[str, str], ResponseLike]
RegisterUserFixture = Callable[[str, str], ResponseLike]


def test_register_happy_path(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "SecurePassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_signup_endpoint_works(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup",
        json={"email": "signup@example.com", "password": "SecurePassword123!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "signup@example.com"
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(
        client: TestClient,
        register_user: RegisterUserFixture
) -> None:
    """Registrierung mit bereits vorhandener E-Mail-Adresse liefert 409 Conflict."""
    # Erste Registrierung
    register_user("duplicate@example.com", "SecurePassword123!")

    # Zweite Registrierung mit derselben E-Mail-Adresse
    response = client.post(
        "/api/auth/register",
        json={"email": "duplicate@example.com", "password": "AnotherPassword123!"},
    )

    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "SecurePassword123!"},
    )

    assert response.status_code == 422


def test_login_happy_path(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    # Zuerst einen Benutzer registrieren
    register_user("login@example.com", "SecurePassword123!")

    # Login über OAuth2 Password Flow (Formulardaten)
    response = login_user("login@example.com", "SecurePassword123!")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data
    assert "role" in data
    # Prüfen, dass die Tokens nicht leer sind
    assert len(data["access_token"]) > 0
    assert len(data["refresh_token"]) > 0


def test_login_invalid_credentials(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture
) -> None:
    # Zuerst einen Benutzer registrieren
    register_user("wrongpass@example.com", "SecurePassword123!")

    # Login-Versuch mit falschem Passwort
    response = login_user("wrongpass@example.com", "WrongPassword123!")

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


def test_login_nonexistent_user(client: TestClient, login_user: LoginUserFixture) -> None:
    response = login_user("nonexistent@example.com", "SomePassword123!")

    assert response.status_code == 401
    assert "invalid credentials" in response.json()["detail"].lower()


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


def test_register_duplicate_email_case_insensitive_returns_409(client: TestClient) -> None:
    """Mehrfache Registrierung ist bei E-Mails case-insensitive und führt zu 409."""
    # Erste Registrierung mit gemischter Groß-/Kleinschreibung
    response1 = client.post(
        "/api/auth/register",
        json={"email": "CaseSensitive@Example.com", "password": "SecurePassword123!"},
    )
    assert response1.status_code in (200, 201)

    # Zweite Registrierung mit der kleingeschriebenen Variante muss zu einem Konflikt führen
    response2 = client.post(
        "/api/auth/register",
        json={"email": "casesensitive@example.com", "password": "AnotherPassword123!"},
    )
    assert response2.status_code == 409


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
