from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.main import create_app
from app.core.database import get_session

# Import models to register metadata
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    app = create_app()

    # In-memory SQLite engine per test function
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)

    def override_get_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c
