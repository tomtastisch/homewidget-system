from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_jwt(
    subject: str,
    expires_delta: timedelta,
    token_type: str = "access",
    *,
    extra_claims: dict | None = None,
) -> str:
    """
    Erzeugt ein signiertes JWT.

    Fügt einen UUID4-basierten `jti`-Claim für Access-Tokens hinzu, um Blacklisting
    zu ermöglichen.

    Args:
        subject: Subject des Tokens (z.B. E-Mail).
        expires_delta: Gültigkeitsdauer.
        token_type: Typ des Tokens ("access" oder "refresh").
        extra_claims: Optionale zusätzliche Claims (dürfen Pflichtfelder nicht überschreiben).

    Returns:
        Signierter JWT-String.
    """
    now = datetime.now(tz=UTC)
    expire = now + expires_delta
    claims: dict = {"sub": subject, "exp": int(expire.timestamp()), "type": token_type}

    if token_type == "access":
        claims["jti"] = str(uuid4())

    if extra_claims:
        for k, v in extra_claims.items():
            if k not in {"sub", "exp", "type", "jti"}:
                claims[k] = v

    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    """
    Dekodiert und validiert ein JWT.

    Returns:
        Payload-Dict oder None bei Fehler.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload

    except JWTError:
        return None


def create_access_token(data: dict, expires_delta: timedelta) -> str:
    """
    Erzeugt ein Access-JWT aus bereitgestellten Daten.

    Erwartet entweder ein vordefiniertes "sub" in data oder einen "email"-Key zur
    Ableitung des Subjects. Andere Keys werden ignoriert, um sensible Daten zu vermeiden.

    Args:
        data: Dictionary mit Subject-Informationen.
        expires_delta: Gültigkeitsdauer.

    Returns:
        Signierter Access-Token.

    Raises:
        ValueError: Falls Subject fehlt.
    """
    subject = data.get("sub") or data.get("email") or data.get("username")

    if not subject:
        raise ValueError("subject missing for access token")

    return create_jwt(str(subject), expires_delta, token_type="access")


def create_refresh_token(data: dict, expires_delta: timedelta) -> str:
    """
    Erzeugt ein Refresh-JWT aus bereitgestellten Daten.

    Hinweis: Der Service nutzt aktuell opake Refresh-Tokens in der DB. Diese Funktion
    dient der Kompatibilität und möglichem zukünftigem Wechsel.

    Args:
        data: Dictionary mit Subject-Informationen.
        expires_delta: Gültigkeitsdauer.

    Returns:
        Signierter Refresh-Token.

    Raises:
        ValueError: Falls Subject fehlt.
    """
    subject = data.get("sub") or data.get("email") or data.get("username")

    if not subject:
        raise ValueError("subject missing for refresh token")

    return create_jwt(str(subject), expires_delta, token_type="refresh")
