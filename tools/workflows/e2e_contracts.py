"""
E2E-Contracttests: Startet Backend + führt Pytest aus.
"""
from __future__ import annotations

import sys

from .e2e_seeding import seed_e2e
from ..core.environment import get_project_paths, EnvConfig
from ..core.logging_setup import logger
from ..core.port_manager import pick_port, wait_for_port
from ..core.shell_executor import SubprocessManager


def run_e2e_contracts() -> int:
    """
    Orchestriert E2E-Contracttests:
      1. Port ermitteln
      2. Environment vorbereiten
      3. E2E-Seed laden
      4. Uvicorn starten
      5. Auf Backend warten
      6. Pytest ausführen
      7. Uvicorn beenden

    Returns:
        Pytest Exit-Code (0 = alle Tests erfolgreich)
    """
    paths = get_project_paths()

    # Validierung
    if not paths.tests_e2e.is_dir():
        logger.warning(f"{paths.tests_e2e} nicht gefunden, überspringe E2E-Contracttests")
        return 0

    if not paths.backend.is_dir():
        logger.error(f"{paths.backend} nicht gefunden")
        return 1

    # Port ermitteln
    host = EnvConfig.get_e2e_host()
    preferred_port = EnvConfig.get_e2e_port()

    try:
        port = pick_port(host=host, preferred_port=preferred_port)
    except RuntimeError as exc:
        logger.error(f"Port-Ermittlung fehlgeschlagen: {exc}")
        return 1

    logger.info(f"Nutze Backend-Adresse: {host}:{port}")

    # Environment vorbereiten
    env = EnvConfig.prepare_e2e_env(paths=paths, host=host, port=port)

    # Backend ins sys.path (für Seeding)
    backend_str = str(paths.backend)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)

    # E2E-Seed laden
    logger.info("Starte E2E-Seeding")
    rc_seed = seed_e2e()
    if rc_seed != 0:
        logger.error("E2E-Seeding fehlgeschlagen")
        return rc_seed

    # Uvicorn starten
    manager = SubprocessManager()
    try:
        logger.info("Starte Backend (Uvicorn)")
        manager.start(
            cmd=[
                "uvicorn",
                "app.main:app",
                "--host", host,
                "--port", str(port),
                "--log-level", "warning",
            ],
            cwd=str(paths.backend),
            env=env,
        )

        # Auf Backend warten
        logger.info(f"Warte auf Backend unter {host}:{port}")
        if not wait_for_port(host=host, port=port):
            logger.error(f"Backend wurde nicht erreichbar innerhalb der Timeout-Zeit")
            return 1

        logger.info("Backend erreichbar, starte Tests")

        # Pytest ausführen
        import pytest
        rc_tests = pytest.main([
            str(paths.tests_e2e),
            "-m", "contract",
            "-v",
            "--tb=short",
        ])

        return rc_tests

    finally:
        logger.info("Beende Backend")
        manager.stop(timeout=5.0)
