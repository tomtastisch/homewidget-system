"""
Umgebungsvariablen, Pfade und zentrale Konfiguration.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    """Zentrale Pfade relativ zum Projekt."""
    root: Path
    backend: Path
    mobile: Path
    tests: Path
    tests_e2e: Path
    tools: Path
    docs: Path


def get_project_paths() -> ProjectPaths:
    """
    Liefert alle relevanten Projektpfade.

    Root wird ermittelt über: tools/core/environment.py
    → tools/ → homewidget-system/
    """
    here = Path(__file__).resolve()
    root = here.parents[2]  # .../homewidget-system

    return ProjectPaths(
        root=root,
        backend=root / "backend",
        mobile=root / "mobile",
        tests=root / "tests",
        tests_e2e=root / "tests" / "e2e",
        tools=root / "tools",
        docs=root / "docs",
    )


class EnvConfig:
    """
    Zentrale Verwaltung von Umgebungsvariablen für E2E/CI-Orchestrierung.

    Gesteuerte Variablen:
      - E2E_HOST, E2E_PORT: Backend-Adresse für E2E-Tests
      - E2E_API_BASE_URL: URL für API-Calls im Frontend
      - ENV, DATABASE_URL: Backend-Konfiguration
      - REQUEST_LOGGING_ENABLED: Debug-Logging
    """

    DEFAULT_HOST = "127.0.0.1"
    DEFAULT_WAIT_RETRIES = 30
    DEFAULT_WAIT_DELAY = 0.5
    DEFAULT_WAIT_TIMEOUT = 0.2

    @staticmethod
    def get_e2e_host() -> str:
        """Host für E2E-Tests (default: 127.0.0.1)"""
        return os.environ.get("E2E_HOST", EnvConfig.DEFAULT_HOST)

    @staticmethod
    def get_e2e_port() -> int | None:
        """Port für E2E-Tests (optional, wird ggf. automatisch ermittelt)"""
        port_str = os.environ.get("E2E_PORT", "").strip()
        if not port_str:
            return None
        try:
            return int(port_str)
        except ValueError:
            return None

    @staticmethod
    def set_e2e_backend(host: str, port: int) -> None:
        """Setzt E2E_HOST, E2E_PORT und E2E_API_BASE_URL"""
        os.environ["E2E_HOST"] = host
        os.environ["E2E_PORT"] = str(port)
        os.environ["E2E_API_BASE_URL"] = f"http://{host}:{port}"

    @staticmethod
    def get_database_url(paths: ProjectPaths) -> str:
        """
        Liefert die Datenbank-URL für E2E-Tests.

        Priority:
          1. E2E_DATABASE_URL (wenn gesetzt)
          2. DATABASE_URL (wenn gesetzt)
          3. /tmp/homewidget-e2e.db (default; schreibbar in CI)
        """
        e2e_db = os.environ.get("E2E_DATABASE_URL", "").strip()
        if e2e_db:
            return e2e_db

        db_url = os.environ.get("DATABASE_URL", "").strip()
        if db_url:
            return db_url

        # Standard auf /tmp legen, um Readonly-Probleme mit Repo-Dateien zu vermeiden
        return "sqlite:////tmp/homewidget-e2e.db"

    @staticmethod
    def prepare_e2e_env(paths: ProjectPaths, host: str, port: int) -> dict[str, str]:
        """
        Bereitet vollständiges Environment für E2E-Tests vor.

        Setzt:
          - E2E_HOST, E2E_PORT, E2E_API_BASE_URL
          - ENV=test_e2e
          - DATABASE_URL, E2E_DATABASE_URL (absoluter Pfad)
          - REQUEST_LOGGING_ENABLED=0

        Returns:
            Kopie von os.environ mit gesetzten Variablen
        """
        env = os.environ.copy()

        EnvConfig.set_e2e_backend(host, port)
        env["E2E_HOST"] = host
        env["E2E_PORT"] = str(port)
        env["E2E_API_BASE_URL"] = f"http://{host}:{port}"

        # Einheitlicher Test-Modus
        env.setdefault("ENV", "test")

        db_url = EnvConfig.get_database_url(paths)
        env["DATABASE_URL"] = db_url
        env["E2E_DATABASE_URL"] = db_url

        env.setdefault("REQUEST_LOGGING_ENABLED", "0")

        return env
