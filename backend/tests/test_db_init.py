from sqlalchemy import inspect
from sqlmodel import SQLModel, create_engine

# Import models to ensure they are registered with SQLModel.metadata
from app.models.user import User  # noqa: F401
from app.models.widget import RefreshToken, Widget  # noqa: F401
from app.core.db import init_db


def test_db_init_creates_tables() -> None:
    # Use in-memory SQLite for fast isolated schema tests
    engine = create_engine("sqlite://", echo=False)

    # Run schema creation
    init_db(engine)

    # Verify tables exist
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    assert {"users", "widgets", "refresh_tokens"}.issubset(table_names)
