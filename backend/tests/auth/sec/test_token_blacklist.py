from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from freezegun import freeze_time

from app.core.config import settings
from app.core.security import decode_jwt
from app.services.token.blacklist import blacklist_access_token
from tests.utils import auth as auth_utils
from tests.utils.emails import email_for_user
from tests.utils.passwords import valid_password

pytestmark = pytest.mark.integration

def test_non_blacklisted_access_token_is_accepted(
        client: TestClient
) -> None:
    email = email_for_user(1)
    password = valid_password()
    auth_utils.register(client, email, password)
    login_data = auth_utils.login(client, email, password).json()
    access = login_data["access_token"]

    resp = auth_utils.get_me(client, access)
    assert resp.status_code == 200
    assert resp.json()["email"] == email


@pytest.mark.anyio
async def test_blacklisted_access_token_is_rejected(
        client: TestClient
) -> None:
    email = email_for_user(2)
    password = valid_password()
    auth_utils.register(client, email, password)
    login_data = auth_utils.login(client, email, password).json()
    access = login_data["access_token"]

    payload = decode_jwt(access)
    assert payload is not None
    jti = payload.get("jti")
    exp = payload.get("exp")
    assert jti and isinstance(exp, int)

    await blacklist_access_token(jti, datetime.fromtimestamp(exp, tz=UTC))

    resp = auth_utils.get_me(client, access)
    assert resp.status_code in (401, 403)


def test_logout_blacklists_current_access_token(
        client: TestClient
) -> None:
    email = email_for_user(3)
    password = valid_password()
    auth_utils.register(client, email, password)
    login_data = auth_utils.login(client, email, password).json()
    access = login_data["access_token"]

    # Logout should blacklist the presented access token
    resp_logout = auth_utils.logout(client, access)
    assert resp_logout.status_code == 204

    # Subsequent use is rejected
    resp = auth_utils.get_me(client, access)
    assert resp.status_code in (401, 403)


def test_logout_does_not_affect_other_tokens(
        client: TestClient
) -> None:
    email = email_for_user(4)
    password = valid_password()
    auth_utils.register(client, email, password)
    access1 = auth_utils.login(client, email, password).json()["access_token"]
    access2 = auth_utils.login(client, email, password).json()["access_token"]

    # Revoke only access1
    assert auth_utils.logout(client, access1).status_code == 204

    # access1 rejected
    assert auth_utils.get_me(client, access1).status_code in (401, 403)
    # access2 still accepted
    assert auth_utils.get_me(client, access2).status_code == 200


def test_blacklist_entry_lives_at_least_until_token_expiry(
        client: TestClient
) -> None:
    email = email_for_user(5)
    password = valid_password()
    auth_utils.register(client, email, password)
    access = auth_utils.login(client, email, password).json()["access_token"]

    # Blacklist via logout now
    assert auth_utils.logout(client, access).status_code == 204

    # Before expiry: still rejected
    before_exp = datetime.now(tz=UTC) + timedelta(
        minutes=max(0, settings.ACCESS_TOKEN_EXPIRE_MINUTES - 1)
    )
    with freeze_time(before_exp, tz_offset=0):
        assert auth_utils.get_me(client, access).status_code in (401, 403)

    # After expiry: rejected due to expiry anyway (still 401)
    after_exp = datetime.now(tz=UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES + 1)
    with freeze_time(after_exp, tz_offset=0):
        assert auth_utils.get_me(client, access).status_code == 401


def test_logout_when_cache_unavailable_fails_open(
        client: TestClient, monkeypatch
) -> None:
    email = email_for_user(6)
    password = valid_password()
    auth_utils.register(client, email, password)
    access = auth_utils.login(client, email, password).json()["access_token"]

    from fastapi_cache import FastAPICache

    def _raise():  # type: ignore[no-redef]
        raise RuntimeError("no backend")

    monkeypatch.setattr(FastAPICache, "get_backend", _raise)

    # Logout should not crash and returns 204
    assert auth_utils.logout(client, access).status_code == 204

    # Token still works (fail-open semantics)
    assert auth_utils.get_me(client, access).status_code == 200
