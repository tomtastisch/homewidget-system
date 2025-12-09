from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine

from app.models.user import User
from app.models.widget import RefreshToken
from app.services.auth_service import AuthService, ensure_utc_aware


def test_ensure_utc_aware_with_naive_datetime() -> None:
    now = datetime.now()
    naive_dt = datetime(now.year, now.month, now.day, 12, 0, 0)
    assert naive_dt.tzinfo is None

    aware_dt = ensure_utc_aware(naive_dt)

    assert aware_dt.tzinfo is not None
    assert aware_dt.tzinfo == UTC
    assert aware_dt.year == now.year
    assert aware_dt.month == now.month
    assert aware_dt.day == now.day


def test_ensure_utc_aware_with_aware_datetime() -> None:
    now = datetime.now()
    aware_dt = datetime(now.year, now.month, now.day, 12, 0, 0, tzinfo=UTC)
    assert aware_dt.tzinfo == UTC

    result_dt = ensure_utc_aware(aware_dt)

    assert result_dt.tzinfo == UTC
    assert result_dt == aware_dt


def test_ensure_utc_aware_comparison() -> None:
    """Stellt sicher, dass Vergleiche nach der Konvertierung nicht an naive/aware-Kollisionen scheitern."""
    # Simulation SQLite: timezone-aware Datetime wird beim Lesen „naiv“
    now_naive = datetime.now()
    stored_dt = datetime(
        now_naive.year,
        now_naive.month,
        now_naive.day,
        12,
        0,
        0,
    )  # Naiv, wie aus SQLite gelesen
    now = datetime.now(tz=UTC)

    # Ohne ensure_utc_aware würde ein TypeError ausgelöst
    stored_aware = ensure_utc_aware(stored_dt)

    # Vergleiche dürfen keinen TypeError auslösen
    assert isinstance(stored_aware < now, bool)
    assert isinstance(stored_aware > now, bool)


def test_refresh_token_expiration_with_timezone_handling() -> None:
    """Prüft, dass Ablaufprüfungen für Refresh-Tokens naive Datetimes aus SQLite robust behandeln."""
    # In-Memory-Testdatenbank erzeugen
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Test-Benutzer anlegen
        user = User(
            email="timezone-test@example.com",
            password_hash="dummy_hash",
            role="demo",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Refresh-Token mit timezone-aware Ablaufzeit anlegen
        expires_at = datetime.now(tz=UTC) + timedelta(hours=1)
        refresh_token = RefreshToken(
            user_id=user.id,
            token="test-token-12345",
            expires_at=expires_at,  # Mit Zeitzone gespeichert
        )
        session.add(refresh_token)
        session.commit()

        # Token erneut aus DB laden (SQLite kann Zeitzone entfernen)
        retrieved_token = session.get(RefreshToken, refresh_token.id)
        assert retrieved_token is not None

        # SQLite kann Zeitzonen abschneiden – ensure_utc_aware muss das auffangen
        expires_dt = ensure_utc_aware(retrieved_token.expires_at)
        now = datetime.now(tz=UTC)

        # Token darf noch nicht abgelaufen sein
        assert expires_dt > now

        # Abgelaufenes Token testen
        expired_token = RefreshToken(
            user_id=user.id,
            token="expired-token-67890",
            expires_at=datetime.now(tz=UTC) - timedelta(hours=1),  # Bereits abgelaufen
        )
        session.add(expired_token)
        session.commit()

        retrieved_expired = session.get(RefreshToken, expired_token.id)
        assert retrieved_expired is not None

        expired_dt = ensure_utc_aware(retrieved_expired.expires_at)
        assert expired_dt < now  # Token ist abgelaufen


def test_auth_service_handles_naive_refresh_token_expiration() -> None:
    """Integrationstest: AuthService.rotate_refresh verarbeitet naive Datetimes ohne TypeError."""
    # In-Memory-Testdatenbank erzeugen
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Test-Benutzer anlegen
        user = User(
            email="auth-service-tz@example.com",
            password_hash="dummy_hash",
            role="common",
            is_active=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # Abgelaufenes Refresh-Token mit naiver Ablaufzeit (Simulation SQLite) anlegen
        expired_token = RefreshToken(
            user_id=user.id,
            token="expired-refresh-token",
            expires_at=datetime.now() - timedelta(days=30),  # Naiv, in der Vergangenheit
            revoked=False,
        )
        session.add(expired_token)
        session.commit()

        auth_service = AuthService(session)

        # Es soll eine HTTPException (401) wegen abgelaufenem Token kommen, kein TypeError
        with pytest.raises(HTTPException) as exc_info:
            auth_service.rotate_refresh("expired-refresh-token")

        assert exc_info.value.status_code == 401
        assert "invalid refresh token" in exc_info.value.detail.lower()