from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from freezegun import freeze_time
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.services.security import decode_jwt
from app.services.token_blacklist import blacklist_access_token

pytestmark = pytest.mark.integration


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_non_blacklisted_access_token_is_accepted(
    client: TestClient, register_user, login_user
) -> None:
    register_user("accept@example.com", "SecurePassword123!")
    login_data = login_user("accept@example.com", "SecurePassword123!").json()
    access = login_data["access_token"]

    resp = client.get("/api/auth/me", headers=_auth_headers(access))
    assert resp.status_code == 200
    assert resp.json()["email"] == "accept@example.com"


@pytest.mark.anyio
async def test_blacklisted_access_token_is_rejected(
    client: TestClient, register_user, login_user
) -> None:
    register_user("blk@example.com", "SecurePassword123!")
    login_data = login_user("blk@example.com", "SecurePassword123!").json()
    access = login_data["access_token"]

    payload = decode_jwt(access)
    assert payload is not None
    jti = payload.get("jti")
    exp = payload.get("exp")
    assert jti and isinstance(exp, int)

    await blacklist_access_token(jti, datetime.fromtimestamp(exp, tz=UTC))

    resp = client.get("/api/auth/me", headers=_auth_headers(access))
    assert resp.status_code in (401, 403)


def test_logout_blacklists_current_access_token(
    client: TestClient, register_user, login_user
) -> None:
    register_user("logout@example.com", "SecurePassword123!")
    login_data = login_user("logout@example.com", "SecurePassword123!").json()
    access = login_data["access_token"]

    # Logout should blacklist the presented access token
    resp_logout = client.post("/api/auth/logout", headers=_auth_headers(access))
    assert resp_logout.status_code == 204

    # Subsequent use is rejected
    resp = client.get("/api/auth/me", headers=_auth_headers(access))
    assert resp.status_code in (401, 403)


def test_logout_does_not_affect_other_tokens(
    client: TestClient, register_user, login_user
) -> None:
    register_user("multi@example.com", "SecurePassword123!")
    access1 = login_user("multi@example.com", "SecurePassword123!").json()["access_token"]
    access2 = login_user("multi@example.com", "SecurePassword123!").json()["access_token"]

    # Revoke only access1
    assert client.post("/api/auth/logout", headers=_auth_headers(access1)).status_code == 204

    # access1 rejected
    assert client.get("/api/auth/me", headers=_auth_headers(access1)).status_code in (401, 403)
    # access2 still accepted
    assert client.get("/api/auth/me", headers=_auth_headers(access2)).status_code == 200


def test_blacklist_entry_lives_at_least_until_token_expiry(
    client: TestClient, register_user, login_user
) -> None:
    register_user("ttl@example.com", "SecurePassword123!")
    access = login_user("ttl@example.com", "SecurePassword123!").json()["access_token"]

    # Blacklist via logout now
    assert client.post("/api/auth/logout", headers=_auth_headers(access)).status_code == 204

    # Before expiry: still rejected
    before_exp = datetime.now(tz=UTC) + timedelta(
        minutes=max(0, settings.ACCESS_TOKEN_EXPIRE_MINUTES - 1)
    )
    with freeze_time(before_exp, tz_offset=0):
        assert client.get("/api/auth/me", headers=_auth_headers(access)).status_code in (401, 403)

    # After expiry: rejected due to expiry anyway (still 401)
    after_exp = datetime.now(tz=UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES + 1)
    with freeze_time(after_exp, tz_offset=0):
        assert client.get("/api/auth/me", headers=_auth_headers(access)).status_code == 401


def test_logout_when_cache_unavailable_fails_open(
    client: TestClient, monkeypatch, register_user, login_user
) -> None:
    register_user("cachefail@example.com", "SecurePassword123!")
    access = login_user("cachefail@example.com", "SecurePassword123!").json()["access_token"]

    from fastapi_cache import FastAPICache

    def _raise():  # type: ignore[no-redef]
        raise RuntimeError("no backend")

    monkeypatch.setattr(FastAPICache, "get_backend", _raise)

    # Logout should not crash and returns 204
    assert client.post("/api/auth/logout", headers=_auth_headers(access)).status_code == 204

    # Token still works (fail-open semantics)
    assert client.get("/api/auth/me", headers=_auth_headers(access)).status_code == 200
