"""
Zentrales Security-Modul.

Enthält Passwort-Hashing, JWT-Erzeugung/-Validierung sowie OAuth2-Dependency
und `get_current_user`. Zusätzlich stellt es eine Digest-Funktion für
Refresh-Tokens bereit, damit diese nicht im Klartext in der Datenbank
gespeichert werden.

Hinweis (PoC): Blacklist- und Token-Cache verwenden ein In-Memory-Backend.
In Produktion wäre ein verteilter Cache (z. B. Redis) üblich.
"""
from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from typing import Any, TYPE_CHECKING
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from app.services.token.blacklist import is_access_token_blacklisted
from .config import settings
from .database import get_session
from .logging_config import user_id_var
from .types.token import ACCESS, REFRESH

if TYPE_CHECKING:  # pragma: no cover
    from ..models.user import User

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_jwt(
        subject: str,
        expires_delta: timedelta,
        token_type: str = ACCESS,
        *,
        extra_claims: dict | None = None,
) -> str:
    now = datetime.now(tz=UTC)
    expire = now + expires_delta
    claims: dict[str, Any] = {"sub": subject, "exp": int(expire.timestamp()), "type": token_type}

    if token_type == ACCESS:
        claims["jti"] = str(uuid4())

    if extra_claims:
        for k, v in extra_claims.items():
            if k not in {"sub", "exp", "type", "jti"}:
                claims[k] = v

    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload

    except JWTError:
        return None


def create_access_token(data: dict, expires_delta: timedelta) -> str:
    subject = data.get("sub") or data.get("email") or data.get("username")

    if not subject:
        raise ValueError("subject missing for access token")

    return create_jwt(str(subject), expires_delta, token_type=ACCESS)


def create_refresh_token(data: dict, expires_delta: timedelta) -> str:
    subject = data.get("sub") or data.get("email") or data.get("username")

    if not subject:
        raise ValueError("subject missing for refresh token")

    return create_jwt(str(subject), expires_delta, token_type=REFRESH)


def compute_refresh_token_digest(token: str) -> str:
    """
    Erzeugt einen HMAC-SHA256-Digest für den gegebenen Refresh-Token.

    Speichert nur den Digest in der Datenbank, um Klartext-Tokens zu vermeiden.
    """
    key = settings.SECRET_KEY.encode("utf-8")
    msg = token.encode("utf-8")
    return hmac.new(key, msg=msg, digestmod=hashlib.sha256).hexdigest()


async def get_current_user(
        token: str = Depends(oauth2_scheme),
        session: Session = Depends(get_session),
) -> "User":
    # Strikte Ablehnung von Tokens mit führenden/trailing Leerzeichen
    if token != token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    payload = decode_jwt(token)
    if not payload or payload.get("type") != ACCESS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    email = payload.get("sub")
    jti = payload.get("jti")

    # Payload-Felder validieren, bevor wir sie verwenden
    if not isinstance(email, str) or not isinstance(jti, str) or not email or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    if await is_access_token_blacklisted(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Lokaler Import, um Importreihenfolge-/Mapping-Probleme zu vermeiden
    from ..models.user import User  # type: ignore

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive or missing user",
        )

    try:
        user_id_var.set(str(user.id))
    except ValueError:
        # User-ID wird nur für Logging-Kontext gesetzt; Fehler hier ist nicht kritisch.
        pass

    return user
