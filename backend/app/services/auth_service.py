from __future__ import annotations

import secrets
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import HTTPException, status
from sqlmodel import Session, select

from ..core.config import settings
from ..core.logging_config import get_logger
from ..core.security import (
    create_jwt,
    hash_password,
    verify_password,
    compute_refresh_token_digest,
)
from ..core.types.token import ACCESS
from ..models.user import User
from ..models.widget import RefreshToken


def ensure_utc_aware(dt: datetime) -> datetime:
    """
    Stellt sicher, dass ein datetime-Objekt timezone-aware (UTC) ist.

    SQLite speichert keine Timezone-Information, sodass aus der Datenbank gelesene
    Datetimes naive sind. Diese Funktion nimmt an, dass naive Datetimes im UTC-Format
    vorliegen (gemäß Anwendungsstandard) und wandelt sie in timezone-aware UTC um.

    Args:
        dt: Datetime-Objekt (kann naive oder timezone-aware sein).

    Returns:
        Timezone-aware Datetime in UTC. Falls Input naive ist, wird UTC angenommen.
        Falls bereits timezone-aware, wird unverändert zurückgegeben.
    """
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


class AuthService:
    def __init__(self, session: Session):
        self.session = session
        self.log = get_logger("services.auth")

    def signup(self, email: str, password: str) -> User:
        """
        Registriert einen neuen Benutzer.

        Args:
            email: E-Mail-Adresse des Benutzers.
            password: Passwort im Klartext (wird gehasht).

        Returns:
            Neu erstellter User.

        Raises:
            HTTPException: Falls E-Mail bereits registriert ist.
        """
        normalized_email = email.strip().lower()
        existing = self.session.exec(select(User).where(User.email == normalized_email)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(email=normalized_email, password_hash=hash_password(password))
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        self.log.info("user_created", extra={"user_id": user.id})

        return user

    def authenticate(self, email: str, password: str) -> User:
        normalized_email = email.strip().lower()
        user = self.session.exec(select(User).where(User.email == normalized_email)).first()

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

        self.log.debug("user_authenticated", extra={"user_id": user.id})
        return user

    def issue_tokens(self, user: User) -> tuple[str, str, int]:
        """
        Stellt Access- und Refresh-Token für einen Benutzer aus.

        Args:
            user: Benutzer, für den Tokens ausgestellt werden sollen.

        Returns:
            Tuple aus (access_token, refresh_token, expires_in_seconds).
        """
        access = create_jwt(user.email, settings.access_token_expire, token_type=ACCESS)
        refresh_token_plain = secrets.token_urlsafe(48)
        expires_at = datetime.now(tz=UTC) + settings.refresh_token_expire
        rt = RefreshToken(
            user_id=user.id,
            token_digest=compute_refresh_token_digest(refresh_token_plain),
            expires_at=expires_at,
        )
        self.session.add(rt)
        self.session.commit()
        self.log.info("tokens_issued", extra={"user_id": user.id})
        return (
            access,
            refresh_token_plain,
            int(settings.access_token_expire.total_seconds()),
        )

    def rotate_refresh(self, token: str) -> tuple[str, str, int, User]:
        """
        Rotiert ein Refresh-Token und stellt neue Tokens aus.

        Args:
            token: Aktuelles Refresh-Token.

        Returns:
            Tuple aus (neuer_access_token, neuer_refresh_token, expires_in_seconds, user).

        Raises:
            HTTPException: Falls Token ungültig, abgelaufen oder widerrufen ist.
        """
        now = datetime.now(tz=UTC)
        token_digest = compute_refresh_token_digest(token)
        rt = self.session.exec(
            select(RefreshToken).where(
                RefreshToken.token_digest == token_digest,
                cast(Any, RefreshToken.revoked).is_(False),
            )
        ).first()

        if not rt:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        expires_at = ensure_utc_aware(rt.expires_at)

        if expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user: User | None = self.session.get(User, rt.user_id)

        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

        rt.revoked = True
        self.session.add(rt)
        self.session.commit()
        self.log.info("refresh_rotated", extra={"user_id": user.id})
        access, refresh, expires_in = self.issue_tokens(user)
        return access, refresh, expires_in, user
