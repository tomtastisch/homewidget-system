"""
Datenbank-Engine und Session-Verwaltung.
Konfiguriert die SQLModel-Engine und stellt Hilfsfunktionen für Schema-Initialisierung bereit.
"""
from __future__ import annotations

import os
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from .config import settings
from .logging_config import get_logger


def _create_engine_with_fallback(url: str):
    """
    Erzeugt eine Engine und versucht bei SQLite-Dateien schreibrechte‑Probleme
    abzufangen, indem auf /tmp ausgewichen wird (nur Nicht‑Prod).
    """
    try:
        if url.startswith("sqlite:///") or url.startswith("sqlite:////"):
            # Versuche, Zielpfad zu bestimmen
            if url.startswith("sqlite:////"):
                db_path = url.removeprefix("sqlite:////")
            else:  # sqlite:/// -> relativ
                db_path = url.removeprefix("sqlite:///")

            p = Path(db_path)
            # Stelle sicher, dass Verzeichnis existiert
            try:
                p.parent.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass

            # Schreibbarkeit prüfen (nur Nicht‑Prod)
            if settings.ENV != "prod":
                parent = p.parent if p.suffix else Path(".")
                if not os.access(str(parent), os.W_OK):
                    fallback = "sqlite:////tmp/homewidget-e2e.db"
                    LOG.warning(
                        "db_dir_not_writable_fallback_tmp",
                        extra={"original": url, "fallback": fallback},
                    )
                    return create_engine(fallback, echo=False)

        # Für SQLite stabilere Defaults setzen
        if url.startswith("sqlite://"):
            return create_engine(url, echo=False, connect_args={"check_same_thread": False})
        return create_engine(url, echo=False)
    except Exception as exc:  # defensive: als letztes Mittel auf /tmp wechseln
        if settings.ENV != "prod":
            fallback = "sqlite:////tmp/homewidget-e2e.db"
            LOG.warning(
                "db_engine_create_failed_fallback_tmp",
                extra={"original": url, "fallback": fallback},
                exc_info=exc,
            )
            return create_engine(fallback, echo=False)
        raise


engine = _create_engine_with_fallback(settings.DATABASE_URL)
LOG = get_logger("infrastructure.db")


def init_db() -> None:
    """
    Initialisiert das Datenbankschema durch Anlegen aller Tabellen.
    """
    global engine  # Wir ersetzen die Engine ggf. bei Fallback in Nicht‑Prod
    LOG.info(
        "Initializing database schema",
        extra={"env": settings.ENV, "db_url": settings.DATABASE_URL},
    )
    # In Nicht‑Prod Umgebungen: Schreibprobe für SQLite; bei Fehler auf /tmp ausweichen
    try:
        if settings.ENV != "prod" and (
                settings.DATABASE_URL.startswith("sqlite:///") or settings.DATABASE_URL.startswith("sqlite:////")):
            try:
                with engine.begin() as conn:  # type: ignore[attr-defined]
                    # Mini-Schreibprobe
                    conn.exec_driver_sql("PRAGMA user_version=1")
                    conn.exec_driver_sql("PRAGMA user_version")
            except Exception as exc:  # noqa: BLE001
                fallback = "sqlite:////tmp/homewidget-e2e.db"
                LOG.warning(
                    "db_sqlite_write_probe_failed_fallback_tmp",
                    extra={"original": settings.DATABASE_URL, "fallback": fallback},
                    exc_info=exc,
                )
                # Engine neu erstellen und global ersetzen
                engine = _create_engine_with_fallback(fallback)
    except Exception:
        # Schreibprobe ist rein diagnostisch; Fehler hier sollen init nicht verhindern
        LOG.warning("db_sqlite_write_probe_exception", extra={"db_url": settings.DATABASE_URL})

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
