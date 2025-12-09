import secrets
from datetime import UTC, datetime
from typing import Any, cast

from fastapi import HTTPException, status
from sqlmodel import Session, select

from ..core.config import settings
from ..core.logging_config import get_logger
from ..models.user import User
from ..models.widget import RefreshToken
from .security import create_jwt, hash_password, verify_password


def ensure_utc_aware(dt: datetime) -> datetime:
    """Ensure a datetime object is timezone-aware (UTC).

    SQLite doesn't preserve timezone info, so datetimes retrieved from the database
    are naive. This helper assumes naive datetimes are in UTC (per application standard)
    and converts them to timezone-aware UTC datetimes for safe comparison.

    Args:
        dt: A datetime object that may be naive or timezone-aware.

    Returns:
        A timezone-aware datetime in UTC. If input is naive, assumes UTC.
        If input is already timezone-aware, returns it unchanged.

    Example:
        >>> from datetime import datetime, UTC
        >>> naive_dt = datetime(2024, 1, 1, 12, 0, 0)
        >>> aware_dt = ensure_utc_aware(naive_dt)
        >>> aware_dt.tzinfo == UTC
        True
    """
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


class AuthService:
    def __init__(self, session: Session):
        self.session = session
        self.log = get_logger("services.auth")

    def signup(self, email: str, password: str) -> User:
        existing = self.session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(email=email, password_hash=hash_password(password))
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        self.log.info("user_created", extra={"user_id": user.id})
        return user

    def authenticate(self, email: str, password: str) -> User:
        user = self.session.exec(select(User).where(User.email == email)).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        self.log.debug("user_authenticated", extra={"user_id": user.id})
        return user

    def issue_tokens(self, user: User) -> tuple[str, str, int]:
        access = create_jwt(user.email, settings.access_token_expire, token_type="access")
        # persistent refresh token stored server-side for revocation
        refresh_token_plain = secrets.token_urlsafe(48)
        expires_at = datetime.now(tz=UTC) + settings.refresh_token_expire
        rt = RefreshToken(user_id=user.id, token=refresh_token_plain, expires_at=expires_at)
        self.session.add(rt)
        self.session.commit()
        self.log.info("tokens_issued", extra={"user_id": user.id})
        return (
            access,
            refresh_token_plain,
            int(settings.access_token_expire.total_seconds()),
        )

    def rotate_refresh(self, token: str) -> tuple[str, str, int, User]:
        now = datetime.now(tz=UTC)
        rt = self.session.exec(
            select(RefreshToken).where(
                RefreshToken.token == token,
                cast(Any, RefreshToken.revoked).is_(False),
            )
        ).first()
        if not rt:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
        # Ensure timezone-aware comparison using our utility
        expires_at = ensure_utc_aware(rt.expires_at)
        if expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
        user = self.session.get(User, rt.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        # revoke old token and issue a new one
        rt.revoked = True
        self.session.add(rt)
        self.session.commit()
        self.log.info("refresh_rotated", extra={"user_id": user.id})
        access, refresh, expires_in = self.issue_tokens(user)
        return access, refresh, expires_in, user
