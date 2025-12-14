"""
E2E-Seeding: Initialisiert die E2E-Testumgebung mit Testdaten.
"""
from __future__ import annotations

import sys

from ..core.environment import get_project_paths
from ..core.logging_setup import logger


def seed_e2e() -> int:
    """
    Initialisiert die E2E-Testumgebung (Config + Seed-Daten).

    Schritte:
      1. Umgebung vorbereiten (DATABASE_URL setzen)
      2. Backend-Modul importieren
      3. Seed-Daten laden

    Returns:
        0 bei Erfolg, >0 bei Fehler
    """
    paths = get_project_paths()

    # Backend ins sys.path aufnehmen
    backend_str = str(paths.backend)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)

    try:
        # E2E-Konfiguration anwenden (setzt DATABASE_URL etc.)
        logger.info("Wende E2E-Konfiguration an")
        from app.config.test_e2e import apply_env
        apply_env()

        # Seed ausführen
        logger.info("Lade E2E-Seed-Daten")
        from app.initial_data_e2e import run as seed
        seed()

        print("e2e_seed_complete")
        return 0

    except Exception as exc:
        logger.error(f"E2E-Seeding fehlgeschlagen: {exc}", exc_info=True)
        return 1
