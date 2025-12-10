from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Column
from sqlalchemy import JSON as SA_JSON
from sqlmodel import Field, Relationship, SQLModel


class Widget(SQLModel, table=True):
    """
    Content-Widget zur Anzeige in Client-Oberflächen.

    Enthält Präsentationsinformationen und ein flexibles JSON-Payload. Sichtbarkeitsregeln
    ermöglichen Targeting auf spezifische Benutzerrollen oder Kontexte.
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
    freshness_ttl: int = Field(default=0, description="Sekunden, in denen Inhalt als aktuell gilt")
    enabled: bool = Field(default=True, index=True)

    owner_id: int = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)

    owner: "User" = Relationship(back_populates="widgets")


class RefreshToken(SQLModel, table=True):
    """
    Refresh-Token zur Ausstellung neuer Access-Tokens nach Ablauf.
    """

    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)

    token: str = Field(index=True, unique=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)
    revoked: bool = Field(default=False)

    user: "User" = Relationship(back_populates="refresh_tokens")


if TYPE_CHECKING:
    from .user import User
