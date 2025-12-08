from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from ..core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_jwt(subject: str, expires_delta: timedelta, token_type: str = "access") -> str:
    now = datetime.now(tz=UTC)
    expire = now + expires_delta
    to_encode = {"sub": subject, "exp": int(expire.timestamp()), "type": token_type}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_jwt(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


# Convenience wrappers expected by ticket spec
def create_access_token(data: dict, expires_delta: timedelta) -> str:
    """Create an access JWT from provided data.

    Expects either a pre-set "sub" in data or a "email" key to derive subject.
    Other keys are ignored to avoid leaking sensitive data.
    """
    subject = data.get("sub") or data.get("email") or data.get("username")
    if not subject:
        raise ValueError("subject missing for access token")
    return create_jwt(str(subject), expires_delta, token_type="access")


def create_refresh_token(data: dict, expires_delta: timedelta) -> str:
    """Create a refresh JWT from provided data.

    Note: Service currently uses opaque refresh tokens stored in DB. This
    function is provided for compatibility and potential future switch.
    """
    subject = data.get("sub") or data.get("email") or data.get("username")
    if not subject:
        raise ValueError("subject missing for refresh token")
    return create_jwt(str(subject), expires_delta, token_type="refresh")
