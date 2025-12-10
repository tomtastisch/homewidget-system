from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from pydantic import model_validator
from sqlalchemy import Column
from sqlalchemy import JSON as SA_JSON
from sqlalchemy import event
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel

from ..core.logging_config import get_logger

LOG = get_logger("models.widget")


class Widget(SQLModel, table=True):
    """
    Content-BackendWidget zur Anzeige in Client-Oberflächen.

    Enthält Präsentationsinformationen und ein flexibles JSON-Payload. Sichtbarkeitsregeln
    ermöglichen Targeting auf spezifische Benutzerrollen oder Kontexte.
    """

    __tablename__ = "widgets"

    id: int | None = Field(default=None, primary_key=True)

    # Einfache Felder, die in den Tests/Schemas verwendet werden
    name: str = Field(index=True)
    config_json: str = Field(default="{}")

    # Legacy/erweiterte Felder – optional machen, um Tests nicht zu brechen
    product_key: str | None = Field(default=None, index=True, nullable=True)
    version: str | None = Field(default=None, nullable=True)
    type: str | None = Field(default=None, nullable=True)
    title: str | None = Field(default=None, nullable=True)
    description: str | None = None
    image_url: str | None = None
    cta_label: str | None = None
    cta_target: str | None = None

    payload: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(SA_JSON),
    )
    visibility_rules: list[str] = Field(
        default_factory=list,
        sa_column=Column(SA_JSON),
    )
    priority: int = Field(default=0, index=True)

    slot: str | None = Field(default=None, index=True)
    freshness_ttl: int = Field(
        default=0,
        description="Sekunden, in denen Inhalt als aktuell gilt",
    )
    enabled: bool = Field(default=True, index=True)

    owner_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=UTC),
        nullable=False,
    )

    # Beziehung zurück zum User
    owner: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="widgets")
    )


class RefreshToken(SQLModel, table=True):
    """
    Refresh-Token zur Ausstellung neuer Access-Tokens nach Ablauf.
    """

    __tablename__ = "refresh_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)

    token_digest: str = Field(index=True, unique=True)
    expires_at: datetime = Field(index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=UTC),
        nullable=False,
    )
    revoked: bool = Field(default=False)

    # Transientes Klartext‑Token (nicht persistiert). Über Property/Setter verarbeitet.
    _token: str | None = None

    # Beziehung zurück zum User
    user: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="refresh_tokens")
    )

    # Erlaube Tests, ein Feld "token" zu übergeben, das automatisch zu
    # einem Digest in token_digest gewandelt wird, ohne das Klartext-Token
    # in der DB zu speichern.
    @model_validator(mode="before")
    @classmethod
    def _ensure_digest_before(cls, data):  # type: ignore[no-untyped-def]
        # Vor der Validierung: Rohdaten untersuchen. Wenn "token" als Konstruktor-Argument
        # übergeben wurde, trotzdem token_digest ableiten.
        try:
            if isinstance(data, dict) and "token" in data and "token_digest" not in data:
                token_val = data.get("token")
                if token_val:
                    from ..core.security import compute_refresh_token_digest

                    data = {**data, "token_digest": compute_refresh_token_digest(str(token_val))}

        except Exception as exc:  # noqa: BLE001  # bewusstes Catch-All: Validator soll robust bleiben, Fehler werden geloggt
            LOG.warning("refresh_token_digest_prepare_failed", exc_info=exc)

        return data

    @model_validator(mode="after")
    def _ensure_digest(self) -> "RefreshToken":
        # Wenn ein transienter Klartext-Token übergeben wurde, Digest berechnen
        if getattr(self, "_token", None) and not getattr(self, "token_digest", None):
            from ..core.security import compute_refresh_token_digest

            self.token_digest = compute_refresh_token_digest(str(self._token))
        return self


# SQLAlchemy-Sicherheitsnetz: Falls der Pydantic-Validator nicht greift,
# wird vor dem Insert der Digest aus einem ggf. vorhandenen transienten
# Attribut `token` erzeugt.
@event.listens_for(RefreshToken, "before_insert")
def _refresh_token_before_insert(mapper, connection, target: RefreshToken) -> None:  # type: ignore[override]
    if not getattr(target, "token_digest", None):
        token = getattr(target, "_token", None)

        if token:
            from ..core.security import compute_refresh_token_digest

            target.token_digest = compute_refresh_token_digest(str(token))


@event.listens_for(RefreshToken, "init", propagate=True)
def _refresh_token_on_init(target: RefreshToken, args, kwargs):  # type: ignore[no-untyped-def]
    # Falls bei der Konstruktion ein Klartext-Token übergeben wird, direkt den Digest setzen
    try:
        token = None
        if isinstance(kwargs, dict):
            token = kwargs.get("token")

        if token and not getattr(target, "token_digest", None):
            from ..core.security import compute_refresh_token_digest

            target.token_digest = compute_refresh_token_digest(str(token))

    except Exception as exc:  # noqa: BLE001  # bewusstes Catch-All: Schutznetz bei Model-Init, Fehler werden geloggt
        # Fehler bei Initialisierung sollen die Konstruktion nicht verhindern
        LOG.warning("refresh_token_init_digest_failed", exc_info=exc)

    # Versuche, das übergebene Token auf die transiente Property zu legen,
    # sodass weitere Hooks es sehen können.
    try:
        if isinstance(kwargs, dict) and "token" in kwargs:
            object.__setattr__(target, "_token", kwargs.get("token"))

    except Exception as exc:  # noqa: BLE001  # bewusstes Catch-All: Setzen der transienten Property darf Init nicht verhindern
        LOG.warning("refresh_token_init_set_token_property_failed", exc_info=exc)

    # Implementiere Property, damit spätere Setzungen von token den Digest erzeugen
    def _set_token(self: RefreshToken, value):  # type: ignore[no-redef]
        object.__setattr__(self, "_token", value)

        if value and not getattr(self, "token_digest", None):
            from ..core.security import compute_refresh_token_digest

            self.token_digest = compute_refresh_token_digest(str(value))

    if not hasattr(RefreshToken, "token"):
        # dynamisch Setter anhängen nur einmal
        def token_getter(self: RefreshToken):  # type: ignore[no-redef]
            return getattr(self, "_token", None)

        RefreshToken.token = property(token_getter, _set_token)  # type: ignore[attr-defined]


if TYPE_CHECKING:
    from .user import User