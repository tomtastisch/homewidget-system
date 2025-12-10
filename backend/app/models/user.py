from __future__ import annotations

"""Datenbankmodell für Benutzer und zugehörige Rollen."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import func
from sqlmodel import Field, Relationship, SQLModel

from enum import Enum


class UserRole(str, Enum):
    """Benutzer-Rollen für Zugriffskontrolle."""
    demo = "demo"
    common = "common"
    premium = "premium"


class User(SQLModel, table=True):
    """
    Benutzer des Systems.

    Speichert Login-Credentials und die Abonnement-Rolle für Feature-Zugriffskontrolle
    (demo/common/premium).
    """

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.demo, description="User role (demo/common/premium)")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=UTC), nullable=False)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=UTC),
        sa_column_kwargs={"onupdate": func.now()},
        nullable=False,
    )

    widgets: list["Widget"] = Relationship(back_populates="owner")
    refresh_tokens: list["RefreshToken"] = Relationship(back_populates="user")


if TYPE_CHECKING:
    from .widget import RefreshToken, Widget
