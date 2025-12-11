from __future__ import annotations

import pytest
from sqlalchemy import inspect
from sqlmodel import SQLModel, create_engine

# Modelle importieren, damit sie in SQLModel.metadata registriert sind
from app.models.widget import RefreshToken, Widget  # noqa: F401

"""
Unit‑Test für die initiale Datenbankerstellung. Hier wird sichergestellt,
dass alle erwarteten Tabellen durch SQLModel angelegt werden.
"""
pytestmark = pytest.mark.unit


def test_db_init_creates_tables() -> None:
    # In-Memory-SQLite für schnelle, isolierte Schema-Tests
    engine = create_engine("sqlite://", echo=False)

    try:
        # Schema über SQLModel-Metadaten erzeugen
        SQLModel.metadata.create_all(engine)

        # Prüfen, welche Tabellen existieren
        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())

        assert {"users", "widgets", "refresh_tokens"}.issubset(table_names)
    finally:
        # Verbindungen explizit schließen, um ResourceWarnings zu vermeiden
        engine.dispose()
