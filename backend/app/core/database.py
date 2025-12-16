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

DB_SCHEMA_VERSION = 1  # Dokumentiert die aktuelle Schema-Version für SQLite PRAGMA user_version

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
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(f"PRAGMA user_version={DB_SCHEMA_VERSION}")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
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
    # Nur importieren, wenn die Metadaten noch leer sind, um unnötige Seiteneffekte zu vermeiden.
    if not SQLModel.metadata.tables:
        try:  # lokale Importe, um zyklische Abhängigkeiten zu vermeiden
            from ..models.user import User  # noqa: F401
            from ..models.widget import Widget, RefreshToken  # noqa: F401
        except Exception as exc:  # pragma: no cover - defensive
            LOG.warning("model_import_failed", extra={"error": str(exc)})
    SQLModel.metadata.create_all(engine)

    # Leichte Auto‑Migrationen für SQLite in Nicht‑Prod:
    # Füge fehlende Spalten hinzu, die in älteren lokalen DB‑Dateien fehlen können.
    try:
        if settings.ENV != "prod" and settings.DATABASE_URL.startswith("sqlite://"):
            with engine.begin() as conn:  # type: ignore[attr-defined]
                # Prüfe bestehende Spalten der Tabelle 'users'
                res = conn.exec_driver_sql("PRAGMA table_info('users')")
                cols = {row[1] for row in res.fetchall()}  # row[1] = name

                # users.role
                if "role" not in cols:
                    LOG.warning("db_auto_migrate_add_users_role")
                    # SQLite: ALTER TABLE ADD COLUMN mit Default
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'common'")

                # users.created_at
                if "created_at" not in cols:
                    LOG.warning("db_auto_migrate_add_users_created_at")
                    # NOT NULL mit Default auf aktuelle Zeit (UTC) für bestehende Zeilen
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP)"
                    )

                # users.updated_at
                if "updated_at" not in cols:
                    LOG.warning("db_auto_migrate_add_users_updated_at")
                    # NOT NULL mit Default auf aktuelle Zeit (UTC) für bestehende Zeilen
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP)"
                    )

                # ---- Tabelle 'refresh_tokens' prüfen ----
                res = conn.exec_driver_sql("PRAGMA table_info('refresh_tokens')")
                rt_cols = {row[1] for row in res.fetchall()}
                if "token_digest" not in rt_cols:
                    LOG.warning("db_auto_migrate_add_refresh_tokens_token_digest")
                    # TEXT Spalte für Digest; NOT NULL mit leerem Default für bestehende Zeilen
                    # (Unique-Constraint kann mit ALTER TABLE in SQLite nicht nachgerüstet werden)
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "ALTER TABLE refresh_tokens ADD COLUMN token_digest TEXT NOT NULL DEFAULT ''"
                    )

                # Legacy-Spalte 'token' entfernen, falls vorhanden (nur Nicht‑Prod):
                # Ältere lokale DBs können eine NOT NULL Spalte 'token' enthalten, die zu
                # INSERT-Fehlern führt, wenn nur 'token_digest' verwendet wird. In SQLite
                # ist das Entfernen einer Spalte nur über Tabellenneuaufbau möglich.
                res = conn.exec_driver_sql("PRAGMA table_info('refresh_tokens')")
                rt_info = res.fetchall()
                rt_cols_now = {row[1] for row in rt_info}
                has_legacy_token = "token" in rt_cols_now
                if has_legacy_token:
                    LOG.warning("db_auto_migrate_rebuild_refresh_tokens_drop_legacy_token")
                    # Tabelle neu aufbauen ohne 'token'. Unique Index auf token_digest wird
                    # nach dem Copy angelegt.
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        """
                        CREATE TABLE IF NOT EXISTS refresh_tokens__new
                        (
                            id
                            INTEGER
                            PRIMARY
                            KEY,
                            user_id
                            INTEGER
                            NOT
                            NULL,
                            token_digest
                            TEXT
                            NOT
                            NULL,
                            expires_at
                            DATETIME
                            NOT
                            NULL,
                            created_at
                            DATETIME
                            NOT
                            NULL,
                            revoked
                            BOOLEAN
                            NOT
                            NULL
                            DEFAULT
                            0,
                            FOREIGN
                            KEY
                        (
                            user_id
                        ) REFERENCES users
                        (
                            id
                        )
                            );
                        """
                    )
                    # Bestehende Daten migrieren; token_digest leer lassen, falls unbekannt
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        """
                        INSERT INTO refresh_tokens__new (id, user_id, token_digest, expires_at, created_at, revoked)
                        SELECT id,
                               user_id,
                               CASE WHEN token_digest IS NOT NULL AND token_digest != '' THEN token_digest ELSE '' END,
                               expires_at,
                               created_at,
                               revoked
                        FROM refresh_tokens;
                        """
                    )
                    # Alte Tabelle verwerfen und neue umbenennen
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("DROP TABLE refresh_tokens")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE refresh_tokens__new RENAME TO refresh_tokens")
                    # Unique Index auf token_digest absichern (falls nicht vorhanden)
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "CREATE UNIQUE INDEX IF NOT EXISTS ix_refresh_tokens_token_digest ON refresh_tokens (token_digest)"
                    )

                # ---- Tabelle 'widgets' prüfen ----
                res = conn.exec_driver_sql("PRAGMA table_info('widgets')")
                w_cols = {row[1] for row in res.fetchall()}
                if "product_key" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_product_key")
                    # Nullable, da Feld optional ist
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "ALTER TABLE widgets ADD COLUMN product_key TEXT"
                    )

                # Weitere optionale Präsentationsspalten nachrüsten, falls sie fehlen (TEXT, nullable)
                for col in ("version", "type", "title", "description", "image_url", "cta_label", "cta_target"):
                    if col not in w_cols:
                        LOG.warning("db_auto_migrate_add_widgets_col_%s", col)
                        # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                        # language=SQL, dialect=SQLite
                        conn.exec_driver_sql(f"ALTER TABLE widgets ADD COLUMN {col} TEXT")

                # JSON-ähnliche Felder (als TEXT in SQLite) nachrüsten
                for col in ("payload", "visibility_rules"):
                    if col not in w_cols:
                        LOG.warning("db_auto_migrate_add_widgets_col_%s", col)
                        # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                        # language=SQL, dialect=SQLite
                        conn.exec_driver_sql(f"ALTER TABLE widgets ADD COLUMN {col} TEXT")

                # Numerische/Flag-Felder mit Defaults nachrüsten
                if "priority" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_priority")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE widgets ADD COLUMN priority INTEGER NOT NULL DEFAULT 0")

                if "slot" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_slot")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE widgets ADD COLUMN slot TEXT")

                if "freshness_ttl" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_freshness_ttl")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE widgets ADD COLUMN freshness_ttl INTEGER NOT NULL DEFAULT 0")

                if "enabled" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_enabled")
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql("ALTER TABLE widgets ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT 1")

                if "created_at" not in w_cols:
                    LOG.warning("db_auto_migrate_add_widgets_created_at")
                    # NOT NULL mit Default auf aktuelle Zeit (UTC) für bestehende Zeilen
                    # noinspection SqlDialectInspection,SqlNoDataSourceInspection
                    # language=SQL, dialect=SQLite
                    conn.exec_driver_sql(
                        "ALTER TABLE widgets ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP)"
                    )
    except Exception as exc:  # pragma: no cover - Migration darf init nicht verhindern
        LOG.warning("db_sqlite_auto_migrate_failed", exc_info=exc)
    LOG.info("Database schema ready")


def get_session():
    """
    Stellt eine Datenbank-Session als Dependency zur Verfügung.
    """
    with Session(engine) as session:
        yield session
