"""
Hilfsfunktionen für Datenbankinitialisierung.

Bietet kontrollierten Zugriff auf Schema-Erstellung via SQLModel.metadata.create_all(engine).
Kann bei App-Start oder in separaten Initialisierungs-Flows verwendet werden und vereinfacht
Tests durch Übergabe einer benutzerdefinierten Engine.
"""
from __future__ import annotations

from typing import Optional, Union
from sqlalchemy.engine import Connection, Engine
from sqlmodel import SQLModel
from .database import engine as app_engine


EngineLike = Union[Engine, Connection]


def init_db(engine: Optional[EngineLike] = None) -> None:
    """
    Erzeugt alle von SQLModel-Modellen definierten Tabellen.

    Args:
        engine: Optional. Falls nicht angegeben, wird die Anwendungs-Engine verwendet.
    """

    target: EngineLike = engine or app_engine  # type: ignore[assignment]
    SQLModel.metadata.create_all(target)
