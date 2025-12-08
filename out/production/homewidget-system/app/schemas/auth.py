from datetime import datetime

from pydantic import BaseModel, EmailStr


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


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

    class Config:
        from_attributes = True
