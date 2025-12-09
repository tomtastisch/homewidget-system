from __future__ import annotations
"""
Test-Konfiguration und Fixtures für die Backend-Test-Suite.

Stellt pro Testfunktion eine temporäre SQLite-Datenbank (`engine`, `db_session`)
und einen FastAPI-`client` bereit, der dieselbe Datenbank über Dependency-Overrides nutzt.
Die Modelle werden importiert, damit ihre Tabellen in SQLModel-Metadaten registriert sind.
"""

import tempfile
from collections.abc import Generator, Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.engine import Engine

from app.main import create_app

# Modelle zuerst importieren, damit sie in den SQLModel-Metadaten registriert werden
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


@pytest.fixture(scope="function")
def engine() -> Generator[Engine, None, None]:
    """Erzeugt eine temporäre SQLite-Engine für genau eine Testfunktion."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        test_engine = create_engine(f"sqlite:///{db_path}", echo=False)
        # ensure schema is present
        SQLModel.metadata.create_all(test_engine)
        yield test_engine

    finally:
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

    # Nur die Datenbank-Session-Dependency überschreiben, damit alle denselben Engine nutzen
    from app.core.database import get_session as _prod_get_session

    def _get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[_prod_get_session] = _get_test_session

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture()
def register_user(client: TestClient) -> Callable[[str, str], dict]:
    """
    Hilfs-Fixture, die einen Benutzer registriert und die JSON-Antwort zurückgibt.

    Verwendung in Tests: data = register_user(email, password)
    """
    def _register(email: str, password: str) -> dict:
        resp = client.post(
            "/api/auth/register",
            json={"email": email, "password": password},
        )
        assert resp.status_code in (200, 201)
        return resp.json()

    return _register


@pytest.fixture()
def login_user(client: TestClient) -> Callable[[str, str], object]:
    """
    Hilfs-Fixture für den OAuth2-Passwort-Login; gibt die HTTP-Antwort zurück.

    Verwendung in Tests: resp = login_user(email, password)
    """
    def _login(email: str, password: str):
        return client.post(
            "/api/auth/login",
            data={
                "username": email,
                "password": password,
            },
        )

    return _login
