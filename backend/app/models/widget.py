from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Column
from sqlalchemy import JSON as SA_JSON
from sqlmodel import Field, Relationship, SQLModel


class Widget(SQLModel, table=True):
    """Content Widget shown in client surfaces.

    Contains presentation info and an arbitrary JSON payload. Visibility rules
    allow targeting to specific user roles or contexts.
    """

    __tablename__ = "widgets"

    id: int | None = Field(default=None, primary_key=True)
    product_key: str = Field(index=True)
    version: str
    type: str
    title: str
    description: str | None = None
    image_url: str | None = None
    cta_label: str | None = None
    cta_target: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(SA_JSON))
    visibility_rules: list[str] = Field(default_factory=list, sa_column=Column(SA_JSON))
    priority: int = Field(default=0, index=True)
    slot: str | None = Field(default=None, index=True)
    freshness_ttl: int = Field(default=0, description="Seconds to consider content fresh")
    enabled: bool = Field(default=True, index=True)

    owner_id: int = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)

    owner: "User" = Relationship(back_populates="widgets")


class RefreshToken(SQLModel, table=True):
    """Refresh token for issuing new access tokens after expiry."""

    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)
    revoked: bool = Field(default=False)

    user: "User" = Relationship(back_populates="refresh_tokens")


if TYPE_CHECKING:  # circular type resolution for type checkers only
    from .user import User
