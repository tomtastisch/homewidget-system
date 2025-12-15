from __future__ import annotations

"""
Startet für die E2E-Contract-Tests einen lokalen FastAPI-Server auf 127.0.0.1:8100,
damit die HTTP-Aufrufe in den Tests funktionieren. Verwendet das vorhandene
E2E-Testprofil (SQLite-DB im Projektroot, fester Port), und fährt den Server
nach Abschluss der Tests wieder herunter.
"""

import os
import socket
import time
from threading import Thread
from typing import Generator

import pytest
import uvicorn

from app.config.test_e2e import E2E_HOST, E2E_PORT, apply_env


def _is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        try:
            return s.connect_ex((host, port)) == 0
        except OSError:
            return False


@pytest.fixture(scope="session", autouse=True)
def _run_backend_server_for_e2e() -> Generator[None, None, None]:
    # Umgebung für E2E setzen (DB, ENV)
    apply_env()

    # Basis-URL für die Tests explizit setzen
    os.environ.setdefault("E2E_API_BASE_URL", f"http://{E2E_HOST}:{E2E_PORT}")

    # Sicherstellen, dass die E2E-DB ein frisches Schema bekommt (alte Datei löschen)
    try:
        db_url = os.environ.get("DATABASE_URL", "")
        if db_url.startswith("sqlite:///./"):
            # Format: sqlite:///./test_e2e.db -> Datei relativ zum Projektroot
            path = db_url.replace("sqlite:///./", "")
            if os.path.exists(path):
                os.remove(path)
    except Exception:
        # Nicht fatal für die Tests
        pass

    # Falls bereits ein Server auf dem Port läuft, nicht erneut starten
    if _is_port_open(E2E_HOST, E2E_PORT):
        yield None
        return

    # Import erst jetzt, damit die ENV-Variablen (DATABASE_URL etc.) greifen
    from app.main import create_app  # local import to respect apply_env & DB cleanup
    app = create_app()

    config = uvicorn.Config(app, host=E2E_HOST, port=E2E_PORT, log_level="warning")
    server = uvicorn.Server(config)

    thread = Thread(target=server.run, daemon=True)
    thread.start()

    # Warten, bis der Port offen ist
    start = time.time()
    timeout = 10.0
    while time.time() - start < timeout:
        if _is_port_open(E2E_HOST, E2E_PORT):
            break
        time.sleep(0.05)
    else:
        raise RuntimeError("E2E Testserver konnte nicht gestartet werden")

    try:
        yield None
    finally:
        # Server stoppen und Thread joinen
        server.should_exit = True
        # kurze Wartezeit für sauberes Shutdown
        thread.join(timeout=5.0)
