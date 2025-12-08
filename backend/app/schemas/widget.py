from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WidgetBase(BaseModel):
    name: str
    config_json: str = "{}"


class WidgetCreate(WidgetBase):
    pass


class WidgetRead(WidgetBase):
    id: int
    owner_id: int
    created_at: datetime

    # Pydantic v2 style config
    model_config = ConfigDict(from_attributes=True)
