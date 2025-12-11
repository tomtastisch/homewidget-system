"""
Test-Konfiguration und Fixtures für die Backend-Test-Suite.

Stellt pro Testfunktion eine temporäre SQLite-Datenbank (`engine`, `db_session`)
und einen FastAPI-`client` bereit, der dieselbe Datenbank über Dependency-Overrides nutzt.
Die Modelle werden importiert, damit ihre Tabellen in SQLModel-Metadaten registriert sind.
"""
from __future__ import annotations

import tempfile
from collections.abc import Generator, Callable
from pathlib import Path
from typing import Any, Protocol

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, Session, create_engine

from app.main import create_app
# Modelle zuerst importieren, damit sie in den SQLModel-Metadaten registriert werden
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401

try:  # Optional: block real network connections if pytest-socket is available
    from pytest_socket import disable_socket as _disable_socket  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    _disable_socket = None  # type: ignore

# Configure Hypothesis to suppress health check about function-scoped fixtures used with @given
try:  # pragma: no cover - test-only configuration
    from hypothesis import HealthCheck, settings

    settings.register_profile(
        "ci",
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        deadline=None,
    )
    settings.load_profile("ci")
except Exception:
    pass


@pytest.fixture(scope="session", autouse=True)
def _block_real_network() -> None:
    """
    Blockiert ausgehende Netzwerkverbindungen in Tests (Fail-Fast gegen versehentliche
    HTTP‑Calls). Wir nutzen dies nur, wenn das Plugin `pytest-socket` installiert ist.
    Der FastAPI TestClient arbeitet rein in‑process und bleibt davon unberührt.
    """
    if _disable_socket is not None:
        # Allow UNIX domain sockets so AnyIO/Starlette can create event loops and self-pipes
        _disable_socket(allow_unix_socket=True)


class ResponseLike(Protocol):
    """
    Minimales Interface für HTTP-Antwortobjekte im Testkontext.

    Dient ausschließlich der Typisierung in Tests; jede Response mit
    `status_code` und einer `json()`-Methode erfüllt dieses Protokoll.
    """

    status_code: int

    def json(self) -> Any:  # pragma: no cover - reine Typunterstützung
        ...


@pytest.fixture(scope="function")
def engine() -> Generator[Engine, None, None]:
    """Erzeugt eine temporäre SQLite-Engine für genau eine Testfunktion."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        test_engine = create_engine(f"sqlite:///{db_path}", echo=False)
        # Schema für alle registrierten Modelle erzeugen
        SQLModel.metadata.create_all(test_engine)
        yield test_engine
    finally:
        # Verbindungen explizit schließen, um ResourceWarnings zu vermeiden
        test_engine.dispose()
        Path(db_path).unlink(missing_ok=True)


@pytest.fixture(scope="function")
def db_session(engine: Engine) -> Generator[Session, None, None]:
    """Gibt eine SQLModel-Session zurück, die an die Test-Engine gebunden ist."""
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="function")
def client(engine: Engine) -> Generator[TestClient, None, None]:
    """Erzeugt einen FastAPI-TestClient, der die bereitgestellte Test-Engine verwendet."""
    # Produktive App-Erzeugungslogik verwenden
    app = create_app()

    from app.core.database import get_session as prod_get_session

    def _get_test_session() -> Generator[Session, None, None]:
        with Session(engine) as session:
            yield session

    # DB-Session-Dependency für Tests überschreiben
    app.dependency_overrides[prod_get_session] = _get_test_session

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    # Dependency-Overrides aufräumen nach Test
    app.dependency_overrides.clear()


@pytest.fixture()
def register_user(client: TestClient) -> Callable[[str, str], dict[str, Any]]:
    """
    Hilfs-Fixture, die einen Benutzer registriert und die JSON-Antwort zurückgibt.

    Verwendung in Tests: data = register_user(email, password)
    """

    def _register(email: str, password: str) -> dict[str, Any]:
        resp = client.post(
            "/api/auth/register",
            json={"email": email, "password": password},
        )
        assert resp.status_code in (200, 201)
        return resp.json()

    return _register


@pytest.fixture()
def login_user(client: TestClient) -> Callable[[str, str], ResponseLike]:
    """
    Hilfs-Fixture für den OAuth2-Passwort-Login; gibt die HTTP-Antwort zurück.

    Verwendung in Tests: resp = login_user(email, password)
    """

    def _login(email: str, password: str) -> ResponseLike:
        return client.post(
            "/api/auth/login",
            data={
                "username": email,
                "password": password,
            },
        )

    return _login