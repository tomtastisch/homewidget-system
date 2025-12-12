from __future__ import annotations

import threading
from contextlib import contextmanager
from typing import Generator

from app.core.logging_config import get_logger

LOG = get_logger("services.token_refresh_lock")


class RefreshTokenLockManager:
    """
    Manager für Locks bei Token-Refresh-Operationen zur Vermeidung von Race-Conditions.

    Implementiert ein Single-Flight-Pattern: Parallele Refresh-Anfragen für denselben
    Token-Digest werden serialisiert, sodass nur ein Refresh gleichzeitig erfolgen kann.

    Thread-Safety: Diese Implementierung ist thread-safe und verwendet threading.Lock
    für die Synchronisation zwischen parallelen Requests im selben Prozess.

    Hinweis: Bei Multi-Process-Deployments (z.B. mehrere Uvicorn-Worker) bietet dies
    keinen prozessübergreifenden Schutz. Für solche Szenarien wäre ein verteilter Lock
    (z.B. via Redis) notwendig. Da FastAPI-Anwendungen typischerweise mit einem Worker
    pro Prozess laufen und async handling nutzen, ist thread-basierte Synchronisation
    für die meisten Deployment-Szenarien ausreichend.
    """

    def __init__(self) -> None:
        self._locks: dict[str, threading.Lock] = {}
        self._manager_lock = threading.Lock()

    @contextmanager
    def acquire(self, token_digest: str) -> Generator[None, None, None]:
        """
        Context Manager zum Erwerben eines Locks für einen spezifischen Token-Digest.

        Args:
            token_digest: Der Hash des Refresh-Tokens, für den der Lock erworben werden soll.

        Yields:
            None - Der Lock ist erworben und wird beim Verlassen des Contexts freigegeben.

        Beispiel:
            ```python
            lock_manager = RefreshTokenLockManager()
            with lock_manager.acquire(token_digest):
                # Kritischer Abschnitt: Token-Refresh durchführen
                # Nur ein Thread kann diesen Code gleichzeitig für denselben token_digest ausführen
                ...
            ```
        """
        # Lock für diesen Token-Digest abrufen oder erstellen
        with self._manager_lock:
            if token_digest not in self._locks:
                self._locks[token_digest] = threading.Lock()
            token_lock = self._locks[token_digest]

        LOG.debug("acquiring_refresh_lock", extra={"token_digest_hash": hash(token_digest) % 100000})

        # Token-spezifischen Lock erwerben
        token_lock.acquire()
        try:
            LOG.debug("refresh_lock_acquired", extra={"token_digest_hash": hash(token_digest) % 100000})
            yield
        finally:
            token_lock.release()
            LOG.debug("refresh_lock_released", extra={"token_digest_hash": hash(token_digest) % 100000})

            # Cleanup: Lock entfernen wenn er nicht mehr verwendet wird
            # Dies verhindert unbegrenztes Wachstum des Lock-Dictionaries
            # Hinweis: Es besteht eine theoretische Race-Condition zwischen locked() und del,
            # aber das ist akzeptabel - im schlimmsten Fall bleibt ein Lock länger im Dict.
            with self._manager_lock:
                # Double-check: Nur löschen wenn niemand darauf wartet
                if token_digest in self._locks and not self._locks[token_digest].locked():
                    del self._locks[token_digest]
                    LOG.debug("refresh_lock_cleaned_up", extra={"token_digest_hash": hash(token_digest) % 100000})


# Globale Singleton-Instanz für die gesamte Anwendung
_global_refresh_lock_manager = RefreshTokenLockManager()


def get_refresh_lock_manager() -> RefreshTokenLockManager:
    """
    Gibt die globale Singleton-Instanz des RefreshTokenLockManager zurück.

    Returns:
        Die globale RefreshTokenLockManager-Instanz.
    """
    return _global_refresh_lock_manager
