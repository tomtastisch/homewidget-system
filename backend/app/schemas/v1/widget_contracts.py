"""Versionierte v1‑Schemas für den öffentlichen Contract (Feed/Detail/ContentSpec)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ContentBlockV1(BaseModel):
    """Ein einzelner Inhaltsblock innerhalb der ContentSpec."""

    type: str
    props: dict[str, Any] = Field(default_factory=dict)


class ContentSpecV1(BaseModel):
    """ContentSpec im v1‑Format: kind=="blocks" mit einer Liste von Blöcken."""

    kind: Literal["blocks"] = "blocks"
    blocks: list[ContentBlockV1] = Field(default_factory=list)


class WidgetContractV1(BaseModel):
    """Feed‑Teaser für Widgets im v1‑Contract."""

    id: int
    name: str
    priority: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WidgetDetailV1(BaseModel):
    """Detail‑Container mit ContentSpec."""

    id: int
    container: dict[str, Any]
    content_spec: ContentSpecV1


class FeedPageV1(BaseModel):
    """Seitenergebnis für den Feed v1."""

    items: list[WidgetContractV1]
    next_cursor: int | None = None
