from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from ...api.deps import get_current_user
from ...core.config import settings
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...schemas.auth import RefreshRequest, SignupRequest, TokenPair, UserRead
from ...services.auth_service import AuthService
from ...services.rate_limit import InMemoryRateLimiter, parse_rule

router = APIRouter(prefix="/api/auth", tags=["auth"])
LOG = get_logger("api.auth")


# Global in-memory rate limiter instance (will also be attached to app.state in main)
rate_limiter = InMemoryRateLimiter()
login_rule = parse_rule(settings.LOGIN_RATE_LIMIT)


@router.post("/signup", response_model=UserRead)
def signup(payload: SignupRequest, session: Session = Depends(get_session)):
    service = AuthService(session)
    user = service.signup(str(payload.email), payload.password)
    LOG.info("user_signed_up", extra={"user_id": user.id})
    return user


# Alias endpoint to match ticket naming
@router.post("/register", response_model=UserRead)
def register(payload: SignupRequest, session: Session = Depends(get_session)):
    return signup(payload, session)


@router.post("/login", response_model=TokenPair)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    # rate limit per username+ip to reduce brute force
    ip = request.client.host if request.client else "unknown"
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
def refresh(payload: RefreshRequest, session: Session = Depends(get_session)):
    service = AuthService(session)
    access, refresh_token, expires_in, user = service.rotate_refresh(payload.refresh_token)
    LOG.info("token_refreshed", extra={"user_id": user.id})
    return TokenPair(
        access_token=access,
        refresh_token=refresh_token,
        expires_in=expires_in,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )


@router.get("/me", response_model=UserRead)
def me(user=Depends(get_current_user)):
    LOG.debug("me_fetched", extra={"user_id": user.id})
    return user
