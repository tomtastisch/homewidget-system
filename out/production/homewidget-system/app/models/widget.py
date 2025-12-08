from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel


class Widget(SQLModel, table=True):
    __tablename__ = "widgets"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    config_json: str = Field(default="{}")
    owner_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)

    owner: "User" = Relationship(back_populates="widgets")


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)
    revoked: bool = Field(default=False)


if TYPE_CHECKING:  # circular type resolution for type checkers only
    from .user import User
