"""
E2E-Testprofil-Konfiguration.

Diese Datei definiert sinnvolle Defaults für einen lokalen E2E-Run.
Sie wird nicht automatisch vom Core importiert, sondern vom Start-Script
im Ordner `backend/tools/` herangezogen, um Environment-Variablen zu setzen.

Designentscheidungen:
- Separate SQLite-DB im Projekt-Root: `sqlite:///./test_e2e.db`.
- Fester Port: 8100 auf 127.0.0.1.
- Token-Laufzeiten bleiben standardmäßig wie im Dev, um Flakiness zu vermeiden.
"""
from __future__ import annotations

import os

TEST_E2E: bool = True
E2E_DATABASE_URL: str = os.getenv("E2E_DATABASE_URL", "sqlite:///./test_e2e.db")
E2E_HOST: str = os.getenv("E2E_HOST", "127.0.0.1")
E2E_PORT: int = int(os.getenv("E2E_PORT", "8100"))


def apply_env() -> None:
    """Setzt sinnvolle ENV-Defaults für das Backend im E2E-Modus.

    Idempotent: wiederholter Aufruf überschreibt lediglich ENV-Variablen
    mit denselben Werten.
    """
    os.environ.setdefault("ENV", "test_e2e")
    os.environ.setdefault("DATABASE_URL", E2E_DATABASE_URL)
