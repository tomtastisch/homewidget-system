from __future__ import annotations

import os
import sys
from contextvars import ContextVar
from typing import Any, Dict, Optional

from loguru import logger as _loguru

"""
Zentrale Logging-Konfiguration für das Backend mit loguru.

Stellt `get_logger(name)` bereit, der einen loguru-basierten Logger-Adapter
zur Verfügung stellt. Dieser Adapter unterstützt weiterhin Aufrufe wie
`logger.info("msg", extra={...}, exc_info=...)` und injiziert ContextVars
(`request_id_var`, `user_id_var`) als strukturierte Felder in jedes Log.
"""

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id", default=None)


def _get_env_level() -> str:
    lvl = (os.getenv("LOG_LEVEL") or "INFO").upper()
    return lvl


def setup_logging(*, level: Optional[str] = None) -> None:
    """
    Konfiguriert loguru als zentrale Logging-Bibliothek.

    - Ausgabe auf STDOUT
    - Format enthält Zeitstempel, Level, Logger-Name sowie ContextVars (request_id, user_id)
    - Level via Parameter oder `LOG_LEVEL`
    """
    # Alle existierenden Sinks entfernen
    _loguru.remove()

    def _patch(record: Dict[str, Any]) -> None:
        extra = record.setdefault("extra", {})
        # ContextVars injizieren, falls nicht explizit gesetzt
        extra.setdefault("request_id", request_id_var.get() or "-")
        extra.setdefault("user_id", user_id_var.get() or "-")
        # Fallback für Logger-Namen
        extra.setdefault("logger", extra.get("logger", "backend.app"))

    # Gepatchten Logger erstellen
    logger = _loguru.patch(_patch)  # type: ignore[arg-type]

    level_str = (level or _get_env_level()).upper()
    fmt = (
        "{time:YYYY-MM-DD HH:mm:ss.SSS} {level:<8} {extra[logger]} "
        "[rid={extra[request_id]} uid={extra[user_id]}] {message}"
    )
    logger.add(
        sink=sys.stdout,
        level=level_str,
        format=fmt,
        backtrace=False,
        diagnose=False,
    )

    # Gepatchten Logger global merken, damit Adapter ihn nutzen
    globals()["_LOGURU"] = logger


class _LoguruAdapter:
    """
    Adapter, der eine stdlib-ähnliche API über loguru bereitstellt.

    Unterstützt `extra={...}` und `exc_info=...` Parameter, damit bestehende
    Aufrufer unverändert funktionieren.
    """

    def __init__(self, name: str):
        if not name.startswith("backend.app."):
            name = f"backend.app.{name}"
        self._name = name

    @property
    def _logger(self):
        """
        Liefert immer den aktuell konfigurierten Logger.

        Falls `setup_logging()` noch nicht aufgerufen wurde, wird der rohe
        loguru-Logger genutzt (ohne ContextVars im Format).
        """
        base = globals().get("_LOGURU")
        if base is None:
            return _loguru.bind(logger=self._name)
        return base.bind(logger=self._name)

    def _log(
            self,
            level: str,
            msg: str,
            *args: Any,
            extra: Optional[Dict[str, Any]] = None,
            exc_info: Any = None,
            **kwargs: Any,
    ) -> None:
        log = self._logger

        if extra:
            log = log.bind(**extra)

        # exc_info wie bei stdlib: True oder Exception/tuple
        if exc_info:
            if exc_info is True:
                log = log.opt(exception=True)
            else:
                log = log.opt(exception=exc_info)

        # stdlib-Style %-Formatierung emulieren, falls args übergeben
        if args:
            try:
                msg = msg % args
            except (TypeError, ValueError):
                # Falls %-Format/Args nicht passen, Nachricht unverändert lassen
                pass

        getattr(log, level.lower())(msg, **kwargs)

    def debug(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._log("DEBUG", msg, *args, **kwargs)

    def info(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._log("INFO", msg, *args, **kwargs)

    def warning(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._log("WARNING", msg, *args, **kwargs)

    def error(self, msg: str, *args: Any, **kwargs: Any) -> None:
        self._log("ERROR", msg, *args, **kwargs)

    def exception(self, msg: str, *args: Any, **kwargs: Any) -> None:
        # Erzwinge Exception-Stacktrace, wenn nicht explizit gesetzt
        kwargs = dict(kwargs)
        if "exc_info" not in kwargs:
            kwargs["exc_info"] = True
        self._log("ERROR", msg, *args, **kwargs)

    def bind(self, **extra: Any) -> "_LoguruAdapter":
        """
        Optional: kompatibel zur stdlib-API, gibt neuen Adapter mit gebundenen Extras zurück.
        """
        new = _LoguruAdapter(self._name)
        # Binden der Extras erfolgt pro Log-Aufruf; der Adapter speichert nur den Namen.
        return new


def get_logger(name: str) -> _LoguruAdapter:
    """Gibt einen loguru-basierten Logger-Adapter zurück (Signatur unverändert)."""
    return _LoguruAdapter(name)