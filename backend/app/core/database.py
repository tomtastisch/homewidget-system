from __future__ import annotations

"""Datenbank-Engine und Session-Verwaltung.

Konfiguriert SQLModel-Engine und stellt Hilfsfunktionen für Schema-Initialisierung bereit.
"""

from sqlmodel import Session, SQLModel, create_engine

from .config import settings
from .logging_config import get_logger

engine = create_engine(settings.DATABASE_URL, echo=False)
LOG = get_logger("infrastructure.db")


def init_db() -> None:
    """
    Initialisiert das Datenbankschema durch Anlegen aller Tabellen.
    """
    LOG.info("Initializing database schema")
    SQLModel.metadata.create_all(engine)
    LOG.info("Database schema ready")


def get_session():
    """
    Stellt eine Datenbank-Session als Dependency zur Verfügung.
    """
    with Session(engine) as session:
        yield session
