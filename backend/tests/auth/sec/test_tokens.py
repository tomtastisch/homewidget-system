from __future__ import annotations
"""
Tests zur Erstellung und Verifikation von JWT‑Tokens. Die meisten Tests
prüfen die Claims und das Ablaufverhalten der Access‑ und Refresh‑Tokens.
Ein gesonderter Test am Ende verwendet den FastAPI‑TestClient, um das
Verhalten eines abgelaufenen Access‑Tokens am /auth/me‑Endpunkt zu
überprüfen.
"""

from datetime import UTC, datetime, timedelta
from freezegun import freeze_time
from jose import JWTError, jwt

import pytest

from app.core.config import settings
from app.services.security import create_access_token, create_refresh_token
from fastapi.testclient import TestClient

pytestmark = pytest.mark.unit


def test_access_token_has_claims() -> None:
    """
    Access-Token muss Subject, Token-Typ und Ablaufzeit enthalten.
    """
    email = "token-subject-test@example.com"
    payload = {"email": email}
    expires_delta = timedelta(minutes=5)

    # Deterministische Zeit, damit wir das exp-Feld exakt vergleichen können
    with freeze_time("2025-01-01 12:00:00", tz_offset=0):
        token = create_access_token(payload, expires_delta=expires_delta)

        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        assert decoded.get("sub") == email
        assert decoded.get("type") == "access"
        # exp ist ein Integer-Timestamp, berechnet aus der eingefrorenen Zeit + TTL
        assert isinstance(decoded.get("exp"), int)
        expected_exp = int((datetime.now(tz=UTC) + expires_delta).timestamp())
        assert decoded.get("exp") == expected_exp


def test_access_token_expiry_enforced() -> None:
    """
    Access-Token muss nach Ablauf der konfigurierten Lebensdauer bei Verifikation eine JWTError auslösen.
    """
    email = "token-expiry-test@example.com"
    payload = {"email": email}
    short_ttl = timedelta(seconds=1)

    with freeze_time("2025-01-01 12:00:00", tz_offset=0):
        token = create_access_token(payload, expires_delta=short_ttl)

        # Direkt nach Erstellung ist der Token gültig
        decoded_initial = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        assert decoded_initial.get("sub") == email
        # exp korrekt gesetzt
        expected_initial_exp = int((datetime.now(tz=UTC) + short_ttl).timestamp())
        assert decoded_initial.get("exp") == expected_initial_exp

        # Zeit über das Ablaufdatum hinaus verschieben
        future = datetime.now(tz=UTC) + timedelta(seconds=5)
        with freeze_time(future, tz_offset=0):
            # jose.jwt.decode wirft bei abgelaufenem Token eine JWTError
            from pytest import raises

            with raises(JWTError):
                jwt.decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=[settings.ALGORITHM],
                )


def test_refresh_token_type_and_sub() -> None:
    """
    Refresh-Token muss Subject und Typ 'refresh' enthalten.
    """
    email = "refresh-subject-test@example.com"
    payload = {"email": email}
    expires_delta = timedelta(days=7)

    with freeze_time("2025-06-01 08:00:00", tz_offset=0):
        token = create_refresh_token(payload, expires_delta=expires_delta)

        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        assert decoded.get("sub") == email
        assert decoded.get("type") == "refresh"
        assert isinstance(decoded.get("exp"), int)


def test_create_token_missing_subject() -> None:
    """
    Erzeugung eines Tokens ohne Subject/Email/Username muss einen ValueError auslösen.
    """
    from pytest import raises

    # Leere Nutzerdaten => kein Subject ableitbar
    with raises(ValueError, match="subject missing for access token"):
        create_access_token({}, expires_delta=timedelta(minutes=1))


@pytest.mark.integration
def test_me_with_expired_access_token_returns_401(client: TestClient) -> None:
    """
    Ein abgelaufener Access‑Token soll beim Aufruf eines geschützten Endpunkts (GET /api/auth/me)
    zu 401 Unauthorized führen.
    """
    # Arrange: Nutzer registrieren
    email = "expired-access@example.com"
    password = "SecretPass123!"
    resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code in (200, 201)

    # Act: Access‑Token mit sehr kurzer TTL erzeugen und Zeit vorspulen
    short_ttl = timedelta(seconds=1)
    with freeze_time("2025-01-01 10:00:00", tz_offset=0):
        token = create_access_token({"email": email}, expires_delta=short_ttl)

        # Direkt danach ist er noch gültig
        ok = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert ok.status_code == 200

        # Zeit über Ablauf hinaus
        future = datetime.now(tz=UTC) + timedelta(seconds=5)
        with freeze_time(future, tz_offset=0):
            res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert res.status_code == 401