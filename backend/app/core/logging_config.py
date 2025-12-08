import json
import logging
import logging.config
import os
from contextvars import ContextVar
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from typing import Any, Dict

# Context for cross-cutting request/user correlation
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


class ContextFilter(logging.Filter):
    """Injects request_id and user_id into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        rid = request_id_var.get()
        uid = user_id_var.get()
        # Provide defaults for formatter fields
        setattr(record, "request_id", rid or "-")
        setattr(record, "user_id", uid or "-")
        return True


class JsonFormatter(logging.Formatter):
    """Minimal JSON formatter without extra dependencies."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        # Base attributes
        payload: Dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "user_id": getattr(record, "user_id", "-"),
        }
        # Optional common HTTP fields
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
    Configure logging for the backend in a log4j-like style using dictConfig.

    Parameters may be provided explicitly or via environment variables:
    - LOG_LEVEL (default: INFO)
    - LOG_FORMAT: "text" | "json" (default: text in dev, json in prod)
    - LOG_OUTPUT: "stdout" | "file" | "both" (default: stdout)
    - LOG_FILE: path for file output (default: logs/backend.log)
    - LOG_FILE_MAX_BYTES: (default: 5_242_880 ~ 5MB)
    - LOG_FILE_BACKUP_COUNT: (default: 5)
    - ENV: "dev" | "prod" influences defaults
    """

    env = os.getenv("ENV", "dev").lower()
    level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    fmt = (fmt or os.getenv("LOG_FORMAT") or ("text" if env == "dev" else "json")).lower()
    output = (output or os.getenv("LOG_OUTPUT", "stdout")).lower()
    file_path = file_path or os.getenv("LOG_FILE", "logs/backend.log")
    max_bytes = int(max_bytes or os.getenv("LOG_FILE_MAX_BYTES", "5242880"))
    backup_count = int(backup_count or os.getenv("LOG_FILE_BACKUP_COUNT", "5"))

    # Handlers
    handlers: Dict[str, Dict[str, Any]] = {}

    if output in ("stdout", "both"):
        handlers["console"] = {
            "class": "logging.StreamHandler",
            "level": level,
            "stream": "ext://sys.stdout",
            "filters": ["context"],
            "formatter": "dev_text" if fmt == "text" else "json",
        }

    if output in ("file", "both"):
        _ensure_log_dir(file_path)
        handlers["file"] = {
            "()": RotatingFileHandler,
            "level": level,
            "filename": file_path,
            "maxBytes": max_bytes,
            "backupCount": backup_count,
            "encoding": "utf-8",
            "filters": ["context"],
            "formatter": "text" if fmt == "text" else "json",
        }

    # Formatters
    formatters: Dict[str, Dict[str, Any]] = {
        "text": {
            "format": "%(asctime)s %(levelname)s %(name)s [request_id=%(request_id)s user_id=%(user_id)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S%z",
        },
        "dev_text": {
            # Slightly more compact for terminal in dev
            "format": "%(levelname)s %(name)s: %(message)s [rid=%(request_id)s uid=%(user_id)s]",
        },
        "json": {
            "()": JsonFormatter,
        },
    }

    # Logger hierarchy configuration
    loggers: Dict[str, Dict[str, Any]] = {
        # API layer
        "backend.app.api": {"level": level, "propagate": True},
        # Services/domain services (no domain entities)
        "backend.app.services": {"level": level, "propagate": True},
        # Infrastructure: db, cache, security, rate-limit, etc.
        "backend.app.infrastructure": {"level": level, "propagate": True},
    }

    # Root logger
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
            # Fallback if misconfigured
            "console": {
                "class": "logging.StreamHandler",
                "level": level,
                "stream": "ext://sys.stdout",
                "filters": ["context"],
                "formatter": "dev_text" if fmt == "text" else "json",
            }
        },
        "loggers": loggers,
        "root": {"level": level, "handlers": root_handlers or ["console"]},
    }

    logging.config.dictConfig(config)

    # Basic banner in dev to confirm configuration
    if env == "dev":
        logging.getLogger("backend.app").debug(
            "Logging configured (level=%s, fmt=%s, output=%s)", level, fmt, output
        )


def get_logger(name: str) -> logging.Logger:
    """
    Convenience helper to get namespaced loggers under backend.app.*
    """
    if not name.startswith("backend.app."):
        name = f"backend.app.{name}"
    return logging.getLogger(name)
