from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str


class TokenPayload(BaseModel):
    """Payload eines Access-Tokens."""
    sub: str
    exp: int
    type: str = "access"


class RefreshTokenPayload(BaseModel):
    """Payload eines Refresh-Tokens."""
    sub: str
    exp: int
    type: str = "refresh"


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

    model_config = ConfigDict(from_attributes=True)
