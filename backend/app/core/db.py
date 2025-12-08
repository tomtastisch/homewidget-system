"""Database initialization helpers.

This module provides a controlled entry point to create database schema via
SQLModel.metadata.create_all(engine). It can be used at app startup or in
separate initialization flows and simplifies testing by allowing a custom
engine to be passed in.
"""

from typing import Optional
from sqlmodel import SQLModel
from .database import engine as app_engine


def init_db(engine: Optional[object] = None) -> None:
    """
    Create all tables defined by SQLModel models.

    If no engine is provided, the application engine is used.
    """

    SQLModel.metadata.create_all(engine or app_engine)
