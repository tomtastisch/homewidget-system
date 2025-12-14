"""
Port-Management Workflows: Freie Ports ermitteln, Warten auf Ports.
"""
from __future__ import annotations

from ..core.environment import EnvConfig
from ..core.logging_setup import logger
from ..core.port_manager import find_free_port, wait_for_port


def find_free_port_cmd() -> int:
    """
    CLI-Kommando: Ermittelt einen freien Port und gibt ihn auf STDOUT aus.

    Umgebungsvariablen:
      - E2E_HOST (default: 127.0.0.1)

    Returns:
        0 bei Erfolg, 1 bei Fehler
    """
    host = EnvConfig.get_e2e_host()

    try:
        port = find_free_port(host)
        print(port)
        return 0
    except RuntimeError as exc:
        logger.error(f"Fehler bei Port-Ermittlung: {exc}")
        return 1


def wait_for_backend_cmd() -> int:
    """
    CLI-Kommando: Wartet auf Backend-Erreichbarkeit.

    Umgebungsvariablen:
      - E2E_HOST (default: 127.0.0.1)
      - E2E_PORT (Pflicht)
      - E2E_WAIT_RETRIES (default: 30)
      - E2E_WAIT_DELAY (default: 0.5)
      - E2E_WAIT_TIMEOUT (default: 0.2)

    Returns:
        0 bei Erfolg, 1 bei Timeout
    """
    host = EnvConfig.get_e2e_host()
    port = EnvConfig.get_e2e_port()

    if port is None:
        logger.error("E2E_PORT nicht gesetzt")
        return 1

    logger.info(f"Warte auf {host}:{port}")

    if wait_for_port(
            host=host,
            port=port,
            retries=EnvConfig.DEFAULT_WAIT_RETRIES,
            delay=EnvConfig.DEFAULT_WAIT_DELAY,
            timeout=EnvConfig.DEFAULT_WAIT_TIMEOUT,
    ):
        return 0

    logger.error(f"Backend unter {host}:{port} wurde nicht erreichbar")
    return 1
