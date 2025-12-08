"""Database initialization helpers.

This module provides a controlled entry point to create database schema via
SQLModel.metadata.create_all(engine). It can be used at app startup or in
separate initialization flows and simplifies testing by allowing a custom
engine to be passed in.
"""

from typing import Optional, Union
from sqlalchemy.engine import Connection, Engine
from sqlmodel import SQLModel
from .database import engine as app_engine


EngineLike = Union[Engine, Connection]


def init_db(engine: Optional[EngineLike] = None) -> None:
    """
    Create all tables defined by SQLModel models.

    If no engine is provided, the application engine is used.
    """

    target: EngineLike = engine or app_engine  # type: ignore[assignment]
    SQLModel.metadata.create_all(target)
