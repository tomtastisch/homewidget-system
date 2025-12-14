from __future__ import annotations

import os
from typing import Any

import httpx
import pytest

BASE_URL = os.getenv("E2E_API_BASE_URL", "http://127.0.0.1:8100")


def _assert_ok(resp: httpx.Response, ctx: str = "") -> None:
    if resp.status_code >= 400:
        raise AssertionError(
            f"{ctx} expected <400 status, got {resp.status_code}: {resp.text[:500]}"
        )


@pytest.mark.contract
def test_register_login_homefeed() -> None:
    """Testet vollständigen Flow: Registrierung -> Login -> Home-Feed."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # Register mit eindeutiger E-Mail
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        test_password = "TestPassword123!"

        register_resp = client.post(
            "/api/auth/register",
            json={"email": test_email, "password": test_password},
        )
        _assert_ok(register_resp, "register")
        user_data: dict[str, Any] = register_resp.json()
        assert "id" in user_data, "missing user id"
        assert user_data["email"] == test_email, "email mismatch"
        user_id = user_data["id"]

        # Login mit den gerade registrierten Credentials
        login_resp = client.post(
            "/api/auth/login",
            data={"username": test_email, "password": test_password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        _assert_ok(login_resp, "login after register")
        login_data: dict[str, Any] = login_resp.json()
        assert "access_token" in login_data and login_data["access_token"], "missing access_token"
        assert "refresh_token" in login_data and login_data["refresh_token"], "missing refresh_token"

        access = login_data["access_token"]

        # Home-Feed sollte leer sein (neuer Benutzer hat noch keine Widgets)
        feed_resp = client.get(
            "/api/home/feed",
            headers={"Authorization": f"Bearer {access}"},
        )
        _assert_ok(feed_resp, "home_feed")
        feed: list[Any] = feed_resp.json()
        assert isinstance(feed, list), "feed is not a list"
        # Neuer Benutzer hat noch keine Widgets
        assert len(feed) == 0, "new user should have empty feed"

        # Benutzer-Daten abrufen (/api/auth/me)
        me_resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {access}"},
        )
        _assert_ok(me_resp, "get me")
        me_data: dict[str, Any] = me_resp.json()
        assert me_data["id"] == user_id, "user id mismatch in /me"
        assert me_data["email"] == test_email, "email mismatch in /me"
        assert me_data["role"] == "common", "new user should have 'common' role"


@pytest.mark.contract
def test_register_duplicate_email_returns_409() -> None:
    """Testet, dass doppelte E-Mail-Registrierung mit 409 abgelehnt wird."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # Registriere mit bekannter E-Mail
        register_resp = client.post(
            "/api/auth/register",
            json={"email": "demo@example.com", "password": "TestPassword123!"},
        )
        assert register_resp.status_code == 409, f"expected 409, got {register_resp.status_code}"
        data: dict[str, Any] = register_resp.json()
        assert "detail" in data or "message" in data, "missing error detail"


@pytest.mark.contract
def test_register_invalid_email_returns_422() -> None:
    """Testet, dass ungültige E-Mail-Adresse abgelehnt wird."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        register_resp = client.post(
            "/api/auth/register",
            json={"email": "invalid-email", "password": "TestPassword123!"},
        )
        assert register_resp.status_code == 422, f"expected 422, got {register_resp.status_code}"


@pytest.mark.contract
def test_register_missing_password_returns_422() -> None:
    """Testet, dass fehlende Passwort abgelehnt wird."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        register_resp = client.post(
            "/api/auth/register",
            json={"email": "test@example.com"},
        )
        assert register_resp.status_code == 422, f"expected 422, got {register_resp.status_code}"


@pytest.mark.contract
def test_register_missing_email_returns_422() -> None:
    """Testet, dass fehlende E-Mail abgelehnt wird."""
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        register_resp = client.post(
            "/api/auth/register",
            json={"password": "TestPassword123!"},
        )
        assert register_resp.status_code == 422, f"expected 422, got {register_resp.status_code}"
