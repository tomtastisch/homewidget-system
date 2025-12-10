"""Pydantic-Schemas für BackendWidget-Operationen."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    """Basis-Schema für BackendWidget-Daten."""
    name: str
    config_json: str = "{}"


class WidgetCreate(WidgetBase):
    """Schema für BackendWidget-Erstellung."""
    pass


class WidgetRead(WidgetBase):
    """Schema für BackendWidget-Antworten."""
    id: int
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
