"""Test configuration and fixtures."""
import tempfile
from collections.abc import Generator
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from sqlmodel import SQLModel, Session, create_engine

# Import models FIRST to register with SQLModel metadata
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """Create a test client with temporary database per test."""
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

        # Create FastAPI app
        @asynccontextmanager
        async def test_lifespan(app: FastAPI):
            # Initialize cache for tests
            FastAPICache.init(InMemoryBackend(), prefix="homewidget-test")
            yield

        from app.core.config import settings

        app = FastAPI(title=settings.PROJECT_NAME, lifespan=test_lifespan)

        # Import routes AFTER creating app
        from app.api.routes import auth as auth_routes
        from app.api.routes import home as home_routes
        from app.api.routes import widgets as widget_routes

        app.include_router(auth_routes.router)
        app.include_router(widget_routes.router)
        app.include_router(home_routes.router)

        # Add health endpoint
        @app.get("/health")
        def health():
            return {"status": "ok"}

        # Override the database session dependency
        from app.core.database import get_session

        app.dependency_overrides[get_session] = get_test_session

        # Create and yield test client
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
    finally:
        # Clean up temp database
        Path(db_path).unlink(missing_ok=True)
