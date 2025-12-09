"""Test configuration and fixtures."""
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.main import create_app

# Import models FIRST to register with SQLModel metadata
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """Create a test client with temporary database per test.

    Uses the production create_app() function to ensure tests run against
    the same app configuration as production, only overriding the database
    dependency to use a temporary test database.
    """
    # Use a temporary file for the database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    try:
        # Create test engine with temp file
        test_engine = create_engine(f"sqlite:///{db_path}", echo=False)
        SQLModel.metadata.create_all(test_engine)

        def get_test_session():
            """Test session generator using test engine."""
            with Session(test_engine) as session:
                yield session

        # Use production app creation logic
        app = create_app()

        # Override only the database session dependency
        from app.core.database import get_session

        app.dependency_overrides[get_session] = get_test_session

        # Create and yield test client
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
    finally:
        # Clean up temp database
        Path(db_path).unlink(missing_ok=True)
