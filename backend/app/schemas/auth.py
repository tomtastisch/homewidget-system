from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict

from app.core.types.token import ACCESS, BEARER, REFRESH


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = BEARER
    expires_in: int
    role: str


class TokenPayload(BaseModel):
    """Payload eines Access-Tokens."""
    sub: str
    exp: int
    type: str = ACCESS


class RefreshTokenPayload(BaseModel):
    """Payload eines Refresh-Tokens."""
    sub: str
    exp: int
    type: str = REFRESH


class LoginRequest(BaseModel):
    """Anfrage für Benutzer-Login."""
    username: EmailStr
    password: str


class SignupRequest(BaseModel):
    """Anfrage für Benutzer-Registrierung."""
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Anfrage zum Erneuern eines Tokens."""
    refresh_token: str


class UserRead(BaseModel):
    """Benutzer-Daten für API-Antworten."""
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime
    role: str

    model_config = ConfigDict(from_attributes=True)
