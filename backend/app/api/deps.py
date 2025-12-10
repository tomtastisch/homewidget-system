"""FastAPI-Dependency-Funktionen für Authentifizierung und Session-Management."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from ..core.database import get_session
from ..models.user import User
from ..services.security import decode_jwt
from ..core.logging_config import user_id_var
from ..services.token_blacklist import is_access_token_blacklisted

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """
    Extrahiert und validiert den aktuellen Benutzer aus dem Access-Token.
    Prüft Token-Gültigkeit, Blacklist-Status und Benutzer-Aktivität.

    Args:
        token: Bearer-Token aus Authorization-Header.
        session: Datenbank-Session.

    Returns:
        Authentifizierter User.

    Raises:
        HTTPException: Falls Token ungültig, blacklisted oder Benutzer inaktiv ist.
    """

    payload = decode_jwt(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    if await is_access_token_blacklisted(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")

    try:
        user_id_var.set(str(user.id))

    except ValueError:
        pass

    return user
