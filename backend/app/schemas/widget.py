from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WidgetBase(BaseModel):
    name: str
    config_json: str = "{}"


class WidgetCreate(WidgetBase):
    pass


class WidgetRead(WidgetBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True
