from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str = "access"


class RefreshTokenPayload(BaseModel):
    sub: str
    exp: int
    type: str = "refresh"


class LoginRequest(BaseModel):
    username: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime

    # Pydantic v2 style configuration (replaces inner Config class)
    model_config = ConfigDict(from_attributes=True)
