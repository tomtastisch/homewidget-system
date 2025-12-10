from __future__ import annotations

from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from ..conftest import ResponseLike
from ..utils import auth as auth_utils
from ..utils.emails import email_for_user
from ..utils.passwords import valid_password

LOGIN_URL = "/api/auth/login"
REGISTER_URL = "/api/auth/register"
LoginUserFixture = Callable[[str, str], ResponseLike]
RegisterUserFixture = Callable[[str, str], dict]

"""
Diese Datei prüft, dass der OAuth2‑Password‑Flow funktioniert und falsche
Eingaben korrekt abgelehnt werden. Die Tests verwenden das FastAPI‑TestClient
und eine echte Testdatenbank über die Fixtures.
"""
pytestmark = pytest.mark.integration


def test_login_returns_token_pair(
        client: TestClient,
) -> None:
    """Login mit korrekten Zugangsdaten liefert ein vollständiges Token-Paar."""
    email = email_for_user(1)
    password = valid_password()

    # Benutzer registrieren und anschließend einloggen
    auth_utils.register(client, email, password)

    response = auth_utils.login(client, email, password)
    data = response.json()

    # TokenPair-Schema: access_token, refresh_token, token_type, expires_in, role
    assert "access_token" in data
    assert "refresh_token" in data
    assert data.get("token_type") == "bearer"
    assert isinstance(data.get("expires_in"), int)
    assert data.get("role") in {"demo", "common", "premium"}


def test_login_rejects_wrong_password(
        client: TestClient,
) -> None:
    email = email_for_user(2)
    password = valid_password()
    wrong_password = "WrongPassword999!"

    # Benutzer registrieren
    auth_utils.register(client, email, password)

    # Login-Versuch mit falschem Passwort
    response = client.post(
        LOGIN_URL,
        data={
            "username": email,
            "password": wrong_password,
        },
    )

    assert response.status_code == 401
    body = response.json()
    detail = str(body.get("detail", "")).lower()
    # AuthService verwendet den Text "Invalid credentials"
    assert "invalid credentials" in detail


def test_login_rejects_unknown_user(
        client: TestClient,
        login_user: LoginUserFixture,
) -> None:
    email = email_for_user(99)
    password = valid_password()

    # Benutzer existiert nicht; Login muss scheitern
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
    email = email_for_user(3)
    password = valid_password()
    # Benutzer registrieren
    register_user(email, password)

    # Login erwartet Form-Encoded-Daten; JSON-Body wird abgelehnt
    response = client.post(
        LOGIN_URL,
        json={
            "username": email,
            "password": password,
        },
    )
    assert response.status_code in (400, 422)