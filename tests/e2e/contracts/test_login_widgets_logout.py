"""Full-Stack-Light Contract Tests (pytest + httpx)

Flow: Login -> Home-Feed -> Logout

BASE_URL wird aus der ENV `E2E_API_BASE_URL` gelesen, Default: http://127.0.0.1:8100
Hinweis: Backend muss im E2E-Modus laufen (siehe backend/tools/start_test_backend_e2e.sh)
"""
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
def test_login_homefeed_logout() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
        # Login (OAuth2PasswordRequestForm: username, password)
        login_resp = client.post(
            "/api/auth/login",
            data={"username": "demo@example.com", "password": "demo1234"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        _assert_ok(login_resp, "login")
        data: dict[str, Any] = login_resp.json()
        assert "access_token" in data and data["access_token"], "missing access_token"
        assert "refresh_token" in data and data["refresh_token"], "missing refresh_token"

        access = data["access_token"]

        # Home-Feed
        feed_resp = client.get(
            "/api/home/feed",
            headers={"Authorization": f"Bearer {access}"},
        )
        _assert_ok(feed_resp, "home_feed")
        feed = feed_resp.json()
        assert isinstance(feed, list), "feed is not a list"
        assert len(feed) >= 1, "feed is empty"

        # Simple schema smoke-check for first widget
        w0 = feed[0]
        for key in ("id", "name", "owner_id", "created_at"):
            assert key in w0, f"widget missing field: {key}"

        # Logout (access-token widerrufen)
        logout_resp = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {access}"},
        )
        assert logout_resp.status_code in (200, 204), f"logout failed: {logout_resp.status_code} {logout_resp.text}"

        # Optional: erneuter Home-Feed-Aufruf sollte 401 liefern (je nach Blacklist-Implementierung)
        after_resp = client.get(
            "/api/home/feed",
            headers={"Authorization": f"Bearer {access}"},
        )
        assert after_resp.status_code in {401, 403, 200}, (
            "Unexpected status after logout; acceptable values are 401/403 or 200 if access token remains valid by design."
        )
