from __future__ import annotations

"""Pydantic-Schemas für Widget-Operationen."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    """Basis-Schema für Widget-Daten."""
    name: str
    config_json: str = "{}"


class WidgetCreate(WidgetBase):
    """Schema für Widget-Erstellung."""
    pass


class WidgetRead(WidgetBase):
    """Schema für Widget-Antworten."""
    id: int
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
