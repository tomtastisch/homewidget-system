from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session, select

from ..core.config import settings
from ..models.user import User
from ..models.widget import RefreshToken
from .security import hash_password, verify_password, create_jwt


class AuthService:
    def __init__(self, session: Session):
        self.session = session

    def signup(self, email: str, password: str) -> User:
        existing = self.session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        user = User(email=email, password_hash=hash_password(password))
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User:
        user = self.session.exec(select(User).where(User.email == email)).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        return user

    def issue_tokens(self, user: User) -> tuple[str, str, int]:
        access = create_jwt(user.email, settings.access_token_expire, token_type="access")
        # persistent refresh token stored server-side for revocation
        refresh_token_plain = secrets.token_urlsafe(48)
        expires_at = datetime.now(tz=timezone.utc) + settings.refresh_token_expire
        rt = RefreshToken(user_id=user.id, token=refresh_token_plain, expires_at=expires_at)
        self.session.add(rt)
        self.session.commit()
        return access, refresh_token_plain, int(settings.access_token_expire.total_seconds())

    def rotate_refresh(self, token: str) -> tuple[str, str, int]:
        now = datetime.now(tz=timezone.utc)
        rt = self.session.exec(
            select(RefreshToken).where(RefreshToken.token == token, RefreshToken.revoked == False)  # noqa: E712
        ).first()
        if not rt or rt.expires_at < now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        user = self.session.get(User, rt.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
        # revoke old token and issue a new one
        rt.revoked = True
        self.session.add(rt)
        self.session.commit()
        return self.issue_tokens(user)
