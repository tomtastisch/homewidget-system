"""
Zentrale Logging-Konfiguration für das Backend.

Bietet strukturiertes Logging mit Context-Variablen (request_id, user_id),
JSON- und Text-Formatierung sowie Log-Rotation.
"""
from __future__ import annotations

import json
import logging
import logging.config
import os
from contextvars import ContextVar
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from typing import Any, Dict

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


class ContextFilter(logging.Filter):
    """Injiziert request_id und user_id in Log-Records."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        rid = request_id_var.get()
        uid = user_id_var.get()
        setattr(record, "request_id", rid or "-")
        setattr(record, "user_id", uid or "-")
        return True


class JsonFormatter(logging.Formatter):
    """Minimaler JSON-Formatter ohne externe Abhängigkeiten."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: Dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "user_id": getattr(record, "user_id", "-"),
        }
        for key in ("method", "path", "status", "duration_ms", "client"):
            val = getattr(record, key, None)
            if val is not None:
                payload[key] = val

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


def _ensure_log_dir(path: str) -> None:
    directory = os.path.dirname(path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)


def setup_logging(
    *,
    level: str | None = None,
    fmt: str | None = None,
    output: str | None = None,
    file_path: str | None = None,
    max_bytes: int | None = None,
    backup_count: int | None = None,
) -> None:
    """
    Konfiguriert das Logging für das Backend nach log4j-ähnlichem Schema via dictConfig.

    Parameter können explizit übergeben oder über Umgebungsvariablen gesetzt werden:
    - LOG_LEVEL (default: INFO)
    - LOG_FORMAT: "text" | "json" (default: text in dev, json in prod)
    - LOG_OUTPUT: "stdout" | "file" | "both" (default: stdout)
    - LOG_FILE: Dateipfad für File-Output (default: logs/backend.log)
    - LOG_FILE_MAX_BYTES: (default: 5_242_880 ~ 5MB)
    - LOG_FILE_BACKUP_COUNT: (default: 5)
    - ENV: "dev" | "prod" beeinflusst Defaults
    """

    env = (os.getenv("ENV") or "dev").lower()
    level_str = (level or os.getenv("LOG_LEVEL") or "INFO").upper()
    fmt_str = (fmt or os.getenv("LOG_FORMAT") or ("text" if env == "dev" else "json")).lower()
    output_str = (output or os.getenv("LOG_OUTPUT") or "stdout").lower()
    file_path_str = file_path or os.getenv("LOG_FILE") or "logs/backend.log"
    max_bytes_val = max_bytes if max_bytes is not None else int(os.getenv("LOG_FILE_MAX_BYTES") or "5242880")
    backup_count_val = (
        backup_count if backup_count is not None else int(os.getenv("LOG_FILE_BACKUP_COUNT") or "5")
    )

    handlers: Dict[str, Dict[str, Any]] = {}

    if output_str in ("stdout", "both"):
        handlers["console"] = {
            "class": "logging.StreamHandler",
            "level": level_str,
            "stream": "ext://sys.stdout",
            "filters": ["context"],
            "formatter": "dev_text" if fmt_str == "text" else "json",
        }

    if output_str in ("file", "both"):
        _ensure_log_dir(file_path_str)
        handlers["file"] = {
            "()": RotatingFileHandler,
            "level": level_str,
            "filename": file_path_str,
            "maxBytes": max_bytes_val,
            "backupCount": backup_count_val,
            "encoding": "utf-8",
            "filters": ["context"],
            "formatter": "text" if fmt_str == "text" else "json",
        }

    # Formatters
    formatters: Dict[str, Dict[str, Any]] = {
        "text": {
            "format": "%(asctime)s %(levelname)s %(name)s [request_id=%(request_id)s user_id=%(user_id)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S%z",
        },
        "dev_text": {
            "format": "%(levelname)s %(name)s: %(message)s [rid=%(request_id)s uid=%(user_id)s]",
        },
        "json": {
            "()": JsonFormatter,
        },
    }

    loggers: Dict[str, Dict[str, Any]] = {
        "backend.app.api": {"level": level, "propagate": True},
        "backend.app.services": {"level": level, "propagate": True},
        "backend.app.infrastructure": {"level": level, "propagate": True},
    }

    root_handlers = []
    if "console" in handlers:
        root_handlers.append("console")

    if "file" in handlers:
        root_handlers.append("file")

    config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"context": {"()": ContextFilter}},
        "formatters": formatters,
        "handlers": handlers or {
            "console": {
                "class": "logging.StreamHandler",
                "level": level_str,
                "stream": "ext://sys.stdout",
                "filters": ["context"],
                "formatter": "dev_text" if fmt_str == "text" else "json",
            }
        },
        "loggers": loggers,
        "root": {"level": level_str, "handlers": root_handlers or ["console"]},
    }

    logging.config.dictConfig(config)

    if env == "dev":
        logging.getLogger("backend.app").debug(
            "Logging configured (level=%s, fmt=%s, output=%s)", level_str, fmt_str, output_str
        )


def get_logger(name: str) -> logging.Logger:
    """
    Hilfsfunktion zum Erzeugen namensraum-spezifischer Logger unter backend.app.*

    Args:
        name: Logger-Name (wird automatisch mit "backend.app." gepräfixt falls nötig).

    Returns:
        Konfigurierter Logger.
    """
    if not name.startswith("backend.app."):
        name = f"backend.app.{name}"
    return logging.getLogger(name)
