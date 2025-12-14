"""
Core-Module für Projektinitialisierung, Service-Management und CI/E2E-Orchestrierung.

Module:
  - environment: Umgebungsvariablen, Pfade, Konfiguration
  - shell_executor: Shell-Befehle ausführen mit Logging
  - port_manager: TCP-Portmanagement (freie Ports ermitteln, Wartelogik)
  - logging_setup: Zentrales Logging für alle Tools

Beispiel:
    from tools.core.environment import get_project_paths, EnvConfig
    from tools.core.port_manager import find_free_port, wait_for_port
    from tools.core.shell_executor import run_cmd, SubprocessManager
    from tools.core.logging_setup import logger
"""
from .environment import get_project_paths, EnvConfig, ProjectPaths
from .logging_setup import get_logger, logger
from .port_manager import find_free_port, pick_port, wait_for_port, iter_sleep
from .shell_executor import run_cmd, run_cmd_silent, run_cmd_iter, SubprocessManager

__all__ = [
    "get_project_paths",
    "EnvConfig",
    "ProjectPaths",
    "find_free_port",
    "pick_port",
    "wait_for_port",
    "iter_sleep",
    "run_cmd",
    "run_cmd_silent",
    "run_cmd_iter",
    "SubprocessManager",
    "get_logger",
    "logger",
]
