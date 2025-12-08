from sqlmodel import Session, SQLModel, create_engine

from .config import settings
from .logging_config import get_logger

engine = create_engine(settings.DATABASE_URL, echo=False)
LOG = get_logger("infrastructure.db")


def init_db() -> None:
    LOG.info("Initializing database schema")
    SQLModel.metadata.create_all(engine)
    LOG.info("Database schema ready")


def get_session():
    with Session(engine) as session:
        yield session
