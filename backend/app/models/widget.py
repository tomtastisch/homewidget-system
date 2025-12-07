from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship


class Widget(SQLModel, table=True):
    __tablename__ = "widgets"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    config_json: str = Field(default="{}")
    owner_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    owner: "User" = Relationship(back_populates="widgets")


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    revoked: bool = Field(default=False)


from .user import User  # circular type resolution
