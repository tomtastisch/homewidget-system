from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from ...api.deps import get_current_user, oauth2_scheme
from ...core.config import settings
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...core.security import decode_jwt
from ...core.types.token import ACCESS
from ...models.user import User
from ...schemas.auth import RefreshRequest, SignupRequest, TokenPair, UserRead
from ...services.auth_service import AuthService
from ...services.rate_limit import InMemoryRateLimiter, parse_rule
from ...services.token_blacklist import blacklist_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
LOG = get_logger("api.auth")

rate_limiter = InMemoryRateLimiter()
login_rule = parse_rule(settings.LOGIN_RATE_LIMIT)
refresh_rule = parse_rule(settings.REFRESH_RATE_LIMIT)


def _perform_signup(payload: SignupRequest, session: Session) -> User:
    """
    Gemeinsame Signup-Logik für /signup und /register Endpunkte.
    """
    service = AuthService(session)
    user = service.signup(str(payload.email), payload.password)
    LOG.info("user_signed_up", extra={"user_id": user.id})
    return user


@router.post("/signup", response_model=UserRead)
def signup(payload: SignupRequest, session: Session = Depends(get_session)):
    """Registriert ein neues Benutzerkonto."""
    return _perform_signup(payload, session)


@router.post("/register", response_model=UserRead)
def register(payload: SignupRequest, session: Session = Depends(get_session)):
    """Registriert ein neues Benutzerkonto (Alias für /signup)."""
    return _perform_signup(payload, session)


@router.post("/login", response_model=TokenPair)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """
    Authentifiziert einen Benutzer und stellt Token-Paar aus.

    Rate-Limiting pro Username+IP zur Reduzierung von Brute-Force-Angriffen.
    """
    ip = request.client.host if request.client else "unknown"
    # In Test/Dev-Umgebungen deaktivieren wir das Rate-Limit, um flakige Tests zu vermeiden
    if settings.ENV == "prod":
        key = f"login:{ip}:{form_data.username}"
        if not rate_limiter.allow(key, login_rule):
            LOG.warning("login_rate_limited", extra={"client": ip})
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts",
            )
    service = AuthService(session)
    user = service.authenticate(form_data.username, form_data.password)
    LOG.info("login_success", extra={"user_id": user.id, "client": ip})
    access, refresh, expires_in = service.issue_tokens(user)
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, request: Request, session: Session = Depends(get_session)):
    # Vorab: minimale Formatprüfung – leere oder getrimmte Tokens sind ungültig
    token = payload.refresh_token or ""
    if (not isinstance(token, str)) or (token != token.strip()) or (len(token) < 10):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Rate-Limiting nur in Produktion aktivieren
    ip = request.client.host if request.client else "unknown"
    if settings.ENV == "prod":
        key = f"refresh:{ip}"
        if not rate_limiter.allow(key, refresh_rule):
            LOG.warning("refresh_rate_limited", extra={"client": ip})
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many refresh attempts",
            )

    service = AuthService(session)
    access, refresh_token, expires_in, user = service.rotate_refresh(token)
    LOG.info("token_refreshed", extra={"user_id": user.id})
    return TokenPair(
        access_token=access,
        refresh_token=refresh_token,
        expires_in=expires_in,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_token: str = Depends(oauth2_scheme)):
    """
    Meldet die aktuelle Session ab durch Blacklisting des Access-Tokens.

    Hinweis: Dies widerruft nur den präsentierten Access-Token. Refresh-Tokens bleiben
    gültig, da sie in der Datenbank verwaltet werden (Source-of-Truth). Zukünftige Tickets
    können dies erweitern, um Refresh-Tokens pro Session zu widerrufen/aufzuräumen.
    """
    payload = decode_jwt(current_token)
    if not payload or payload.get("type") != ACCESS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    jti = payload.get("jti")
    exp = payload.get("exp")

    if not jti or not isinstance(exp, int):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    expires_at = datetime.fromtimestamp(exp, tz=UTC)
    await blacklist_access_token(jti, expires_at)
    LOG.info("logout_revoked_access_token", extra={"jti": jti})
    return None


@router.get("/me", response_model=UserRead)
def me(user=Depends(get_current_user)):
    LOG.debug("me_fetched", extra={"user_id": user.id})
    return user
