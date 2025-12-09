from __future__ import annotations

from sqlalchemy import inspect
from sqlmodel import SQLModel, create_engine

# Modelle importieren, damit sie in SQLModel.metadata registriert sind
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


def test_db_init_creates_tables() -> None:
    # In-Memory-SQLite für schnelle, isolierte Schema-Tests
    engine = create_engine("sqlite://", echo=False)

    # Schema über SQLModel-Metadaten erzeugen
    SQLModel.metadata.create_all(engine)

    # Prüfen, welche Tabellen existieren
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    assert {"users", "widgets", "refresh_tokens"}.issubset(table_names)