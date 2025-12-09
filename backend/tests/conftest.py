"""Test configuration and fixtures for the backend test suite.

Provides a shared temporary SQLite database per test function via the
`engine` and `db_session` fixtures, and a FastAPI `client` that uses the
same database through dependency overrides. Models are imported here to
ensure their tables are registered in SQLModel metadata before schema
creation.
"""
from __future__ import annotations

import tempfile
from collections.abc import Generator, Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.main import create_app

# Import models FIRST to register with SQLModel metadata
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


@pytest.fixture(scope="function")
def engine() -> Generator[object, None, None]:
    """Create a temporary SQLite engine for a single test function."""
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
def db_session(engine) -> Generator[Session, None, None]:
    """Yield a SQLModel Session bound to the test engine."""
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="function")
def client(engine) -> Generator[TestClient, None, None]:
    """Create a FastAPI TestClient that uses the provided test engine."""
    # Use production app creation logic
    app = create_app()

    # Override only the database session dependency to use the same engine
    from app.core.database import get_session as _prod_get_session

    def _get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[_prod_get_session] = _get_test_session

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture()
def register_user(client: TestClient) -> Callable[[str, str], dict]:
    """Helper fixture to register a user and return JSON response.

    Usage in tests: data = register_user(email, password)
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
    """Helper fixture to perform OAuth2 password login and return Response.

    Usage in tests: resp = login_user(email, password)
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
