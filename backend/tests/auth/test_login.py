from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol

from fastapi.testclient import TestClient

LOGIN_URL = "/api/auth/login"
REGISTER_URL = "/api/auth/register"


class ResponseLike(Protocol):
    status_code: int

    def json(self) -> Any:  # pragma: no cover - Protocol typing helper
        """Parst und liefert den JSON-Body der Antwort."""


LoginUserFixture = Callable[[str, str], ResponseLike]
RegisterUserFixture = Callable[[str, str], ResponseLike]


def test_login_returns_token_pair(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture,
) -> None:
    """Login mit korrekten Zugangsdaten liefert ein vollständiges Token-Paar."""
    email = "login-success@example.com"
    password = "SecurePassword123!"

    register_user(email, password)

    response = login_user(email, password)

    assert response.status_code == 200
    data = response.json()

    # TokenPair-Schema: access_token, refresh_token, token_type, expires_in, role
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("token_type") == "bearer"
    assert isinstance(data.get("expires_in"), int)
    assert data.get("role") in {"demo", "common", "premium"}


def test_login_rejects_wrong_password(
        client: TestClient,
        register_user: RegisterUserFixture,
        login_user: LoginUserFixture,
) -> None:
    email = "login-wrong-password@example.com"
    password = "CorrectPassword123!"
    wrong_password = "WrongPassword999!"

    register_user(email, password)

    response = login_user(email, wrong_password)

    assert response.status_code == 401
    body = response.json()
    detail = str(body.get("detail", "")).lower()
    # AuthService verwendet den Text "Invalid credentials"
    assert "invalid credentials" in detail


def test_login_rejects_unknown_user(
        client: TestClient,
        login_user: LoginUserFixture,
) -> None:
    email = "unknown-user@example.com"
    password = "SomePassword123!"

    response = login_user(email, password)

    assert response.status_code == 401
    body = response.json()
    detail = str(body.get("detail", "")).lower()
    assert "invalid credentials" in detail


def test_login_with_json_body_rejected(
        client: TestClient,
        register_user: RegisterUserFixture,
) -> None:
    """Login erwartet Form-URL-Encoded Daten; JSON-Body wird mit 400/422 abgelehnt."""
    email = "json-login@example.com"
    password = "SomePassword123!"
    register_user(email, password)

    response = client.post(
        LOGIN_URL,
        json={
            "username": email,
            "password": password,
        },
    )
    assert response.status_code in (400, 422)