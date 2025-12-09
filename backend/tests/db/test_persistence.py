from __future__ import annotations
"""
Integrationstests für die Datenpersistenz und Zeitzonenbehandlung. Diese
Tests prüfen die Utility‑Funktion ensure_utc_aware sowie das Verhalten der
AuthService.rotate_refresh‑Methode bei abgelaufenen Tokens und SQLite‑
Datumsformaten.
"""

from datetime import UTC, datetime, timedelta

import pytest

from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine

from app.models.user import User
from app.models.widget import RefreshToken
from app.services.auth_service import AuthService, ensure_utc_aware

pytestmark = pytest.mark.integration


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