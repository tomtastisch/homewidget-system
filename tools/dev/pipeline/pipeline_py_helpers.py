from __future__ import annotations

"""
Python-Helfer für CI/E2E-Orchestrierung.

Dieses Modul wird aus Shell-Skripten (ci_lib.sh / ci_steps.sh) aufgerufen, z. B.:

    python -m tools.dev.pipeline.pipeline_py_helpers find-free-port
    python -m tools.dev.pipeline.pipeline_py_helpers wait-for-backend
    python -m tools.dev.pipeline.pipeline_py_helpers seed-e2e
    python -m tools.dev.pipeline.pipeline_py_helpers run-e2e-contracts

Voraussetzung: Das Projekt-Layout entspricht:

  homewidget-system/
    backend/
      app/...
    tests/
      e2e/...
    tools/
      dev/
        pipeline/
          pipeline_py_helpers.py
"""

import argparse
import os
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

DEFAULT_HOST = "127.0.0.1"


# -----------------------------------------------------------------------------
# Pfad-Helfer
# -----------------------------------------------------------------------------

@dataclass(frozen=True)
class ProjectPaths:
    root: Path
    backend: Path
    tests_e2e: Path


def _paths() -> ProjectPaths:
    """
    Liefert zentrale Pfade relativ zu diesem Modul:

    root       → Projektwurzel (homewidget-system/)
    backend    → backend/
    tests_e2e  → tests/e2e/
    """
    here = Path(__file__).resolve()
    # .../tools/dev/pipeline/pipeline_py_helpers.py
    root = here.parents[3]  # .../homewidget-system
    backend = root / "backend"
    tests_e2e = root / "tests" / "e2e"
    return ProjectPaths(root=root, backend=backend, tests_e2e=tests_e2e)


def _ensure_backend_on_path() -> None:
    """
    Stellt sicher, dass backend/ im sys.path liegt, damit `app.*` importierbar ist.
    """
    paths = _paths()
    backend_str = str(paths.backend)
    if backend_str not in sys.path:
        sys.path.insert(0, backend_str)


# -----------------------------------------------------------------------------
# Generische Helfer
# -----------------------------------------------------------------------------

def _iter_sleep(retries: int, delay: float) -> Iterable[int]:
    """Generator für Wiederholungs-Schleifen mit Pause."""
    for attempt in range(1, retries + 1):
        yield attempt
        time.sleep(delay)


def _pick_port(host: str, port_str: str | None) -> int:
    """
    Gibt einen verwendbaren TCP-Port zurück.

    - Wenn port_str gesetzt und gültig ist → diesen Port nutzen.
    - Andernfalls → freien Port über Bind an host:0 ermitteln.
    """
    if port_str:
        try:
            return int(port_str)
        except ValueError:
            # Fällt unten auf automatische Portwahl zurück
            pass

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            return sock.getsockname()[1]
    except OSError as exc:
        raise RuntimeError(f"konnte keinen freien Port auf Host {host!r} finden: {exc}") from exc


# -----------------------------------------------------------------------------
# Einzel-Kommandos
# -----------------------------------------------------------------------------

def cmd_find_free_port() -> int:
    """
    Ermittelt einen freien TCP-Port auf E2E_HOST (Default: 127.0.0.1) und gibt
    ihn auf STDOUT aus.

    Rückgabe:
        Exit-Code 0 bei Erfolg, >0 bei Fehler.
    """
    host = os.environ.get("E2E_HOST", DEFAULT_HOST)

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            port = sock.getsockname()[1]
    except OSError as exc:
        print(f"ERROR: could not find free port on host {host!r}: {exc}", file=sys.stderr)
        return 1

    print(port)
    return 0


def cmd_wait_for_backend() -> int:
    """
    Wartet darauf, dass ein TCP-Socket zu E2E_HOST:E2E_PORT aufgebaut werden kann.

    Gesteuert über Umgebungsvariablen:
      - E2E_HOST          (str, Default: 127.0.0.1)
      - E2E_PORT          (int, Pflicht)
      - E2E_WAIT_RETRIES  (int, Default: 30)
      - E2E_WAIT_DELAY    (float Sekunden, Default: 0.5)
      - E2E_WAIT_TIMEOUT  (float Sekunden, Default: 0.2) – Socket-Timeout

    Rückgabe:
        Exit-Code 0 bei Erfolg, 1 bei Timeout oder Fehler.
    """
    host = os.environ.get("E2E_HOST", DEFAULT_HOST)
    port_str = os.environ.get("E2E_PORT") or ""
    if not port_str:
        print("ERROR: E2E_PORT is not set or empty.", file=sys.stderr)
        return 1

    try:
        port = int(port_str)
    except ValueError:
        print(f"ERROR: invalid E2E_PORT value: {port_str!r}", file=sys.stderr)
        return 1

    retries = int(os.environ.get("E2E_WAIT_RETRIES", "30"))
    delay = float(os.environ.get("E2E_WAIT_DELAY", "0.5"))
    timeout = float(os.environ.get("E2E_WAIT_TIMEOUT", "0.2"))

    for _ in _iter_sleep(retries=retries, delay=delay):
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return 0
        except OSError:
            # Noch nicht erreichbar – weiter versuchen
            continue

    print(f"ERROR: backend at {host}:{port} did not become reachable in time.", file=sys.stderr)
    return 1


def cmd_seed_e2e() -> int:
    """
    Initialisiert die E2E-Testumgebung (Config + Seed-Daten).

    Erwartet, dass ENV / DATABASE_URL / E2E_DATABASE_URL etc. bereits im
    aufrufenden Shell-Skript gesetzt wurden.
    """
    _ensure_backend_on_path()
    from app.config.test_e2e import apply_env
    from app.initial_data_e2e import run as seed

    apply_env()
    seed()
    print("e2e_seed_complete")
    return 0


def cmd_run_e2e_contracts() -> int:
    """
    Führt die systemweiten E2E-Contracttests aus:

    - ermittelt Host/Port (falls nötig)
    - setzt ENV / E2E_DATABASE_URL / DATABASE_URL / REQUEST_LOGGING_ENABLED
    - wendet die E2E-Konfiguration an und spielt Seed-Daten ein
    - startet uvicorn (app.main:app)
    - wartet auf Erreichbarkeit des Backends
    - führt pytest für tests/e2e -m contract aus
    - beendet den uvicorn-Prozess wieder
    """
    paths = _paths()

    if not paths.tests_e2e.is_dir():
        print(
            f"WARNING: {paths.tests_e2e} not found, skipping E2E-Contracttests.",
            file=sys.stderr,
        )
        return 0
    if not paths.backend.is_dir():
        print(f"ERROR: {paths.backend} not found, cannot run E2E-Contracttests.", file=sys.stderr)
        return 1

    host = os.environ.get("E2E_HOST", DEFAULT_HOST)
    port_env = os.environ.get("E2E_PORT")

    try:
        port = _pick_port(host=host, port_str=port_env)
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    os.environ["E2E_HOST"] = host
    os.environ["E2E_PORT"] = str(port)
    os.environ["E2E_API_BASE_URL"] = f"http://{host}:{port}"

    os.environ.setdefault("ENV", "test_e2e")
    db_url = os.environ.get("E2E_DATABASE_URL") or "sqlite:///./test_e2e.db"
    os.environ["E2E_DATABASE_URL"] = db_url
    os.environ["DATABASE_URL"] = db_url
    os.environ.setdefault("REQUEST_LOGGING_ENABLED", "0")

    # Seed ausführen (damit auch separat via pmcd_run seed-e2e nutzbar ist)
    rc_seed = cmd_seed_e2e()
    if rc_seed != 0:
        return rc_seed

    uvicorn_proc = subprocess.Popen(
        [
            "uvicorn",
            "app.main:app",
            "--host",
            host,
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=str(paths.backend),
    )

    try:
        rc_wait = cmd_wait_for_backend()
        if rc_wait != 0:
            print(
                f"ERROR: backend at {host}:{port} did not become reachable.",
                file=sys.stderr,
            )
            return rc_wait

        import pytest

        return pytest.main(
            [
                str(paths.tests_e2e),
                "-m",
                "contract",
                "-v",
                "--tb=short",
            ]
        )
    finally:
        uvicorn_proc.terminate()
        try:
            uvicorn_proc.wait(timeout=5)
        except Exception:
            uvicorn_proc.kill()


# -----------------------------------------------------------------------------
# CLI-Dispatcher
# -----------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m tools.dev.pipeline.pipeline_py_helpers",
        description="Python-Helfer-Kommandos für CI/E2E-Orchestrierung.",
    )
    parser.add_argument(
        "command",
        choices=(
            "find-free-port",
            "wait-for-backend",
            "seed-e2e",
            "run-e2e-contracts",
        ),
        help="auszuführendes Kommando",
    )

    args = parser.parse_args(argv)

    if args.command == "find-free-port":
        return cmd_find_free_port()
    if args.command == "wait-for-backend":
        return cmd_wait_for_backend()
    if args.command == "seed-e2e":
        return cmd_seed_e2e()
    if args.command == "run-e2e-contracts":
        return cmd_run_e2e_contracts()

    # Sollte durch argparse ausgeschlossen sein
    print(f"Unknown command: {args.command!r}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
