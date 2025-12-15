"""
Datenbank-Engine und Session-Verwaltung.
Konfiguriert die SQLModel-Engine und stellt Hilfsfunktionen für Schema-Initialisierung bereit.
"""
from __future__ import annotations

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
    # Modelle importieren, damit sie in den SQLModel-Metadaten registriert sind
    # (verhindert fehlende Tabellen/Spalten, wenn init_db() früh im Lifespan läuft)
    try:  # lokale Importe, um zyklische Abhängigkeiten zu vermeiden
        from ..models.user import User  # noqa: F401
        from ..models.widget import Widget, RefreshToken  # noqa: F401
    except Exception as exc:  # pragma: no cover - defensive
        LOG.warning("model_import_failed", extra={"error": str(exc)})
    SQLModel.metadata.create_all(engine)
    LOG.info("Database schema ready")


def get_session():
    """
    Stellt eine Datenbank-Session als Dependency zur Verfügung.
    """
    with Session(engine) as session:
        yield session
