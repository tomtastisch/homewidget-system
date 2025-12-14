"""Datenbankmodell für Benutzer und zugehörige Rollen."""
from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import TYPE_CHECKING, List

from sqlalchemy import func
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


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
    role: UserRole = Field(
        default=UserRole.common,
        description="User role (demo/common/premium). 'demo' is only for unauthenticated users.",
    )

    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=UTC),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=UTC),
        sa_column_kwargs={"onupdate": func.now()},
        nullable=False,
    )

    # Forward-referenced relationship collections must use list["Type"] (not a single quoted string)
    # Use explicit SQLAlchemy relationship to avoid forward-ref parsing issues
    widgets: List["Widget"] = Relationship(
        sa_relationship=relationship("Widget", back_populates="owner")
    )
    refresh_tokens: List["RefreshToken"] = Relationship(
        sa_relationship=relationship("RefreshToken", back_populates="user")
    )


if TYPE_CHECKING:
    from .widget import RefreshToken, Widget