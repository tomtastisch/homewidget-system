"""Versionierte v1‑Schemas für den öffentlichen Contract (Feed/Detail/ContentSpec)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ContentBlockV1(BaseModel):
    """Ein einzelner Inhaltsblock innerhalb der ContentSpec."""

    type: str
    props: dict[str, Any] = Field(default_factory=dict)

    @property
    def _allowed_keys(self) -> set[str]:
        if self.type == "hero":
            return {"headline", "subline", "image_url"}
        if self.type == "text":
            return {"text"}
        if self.type == "offer_grid":
            return {"title", "items"}
        # Für unbekannte Typen: keine Props erlauben (fail-closed)
        return set()

    @classmethod
    def _ensure_str(cls, v: Any, field: str) -> None:
        if not isinstance(v, str):
            raise ValueError(f"{field} muss str sein")

    @classmethod
    def _ensure_list(cls, v: Any, field: str) -> list[Any]:
        if not isinstance(v, list):
            raise ValueError(f"{field} muss list sein")
        return v

    @classmethod
    def _ensure_number(cls, v: Any, field: str) -> None:
        if not isinstance(v, (int, float)):
            raise ValueError(f"{field} muss number sein")

    def model_post_init(self, __context: Any) -> None:  # pydantic v2 hook
        # Fail-closed: nur erlaubte Keys je Typ, richtige Typen validieren
        allowed = self._allowed_keys
        # Disallow unknown keys
        unknown = set(self.props.keys()) - allowed
        if unknown:
            raise ValueError(f"Unerlaubte Props für Blocktyp '{self.type}': {sorted(unknown)}")

        if self.type == "hero":
            headline = self.props.get("headline")
            subline = self.props.get("subline")
            image_url = self.props.get("image_url")
            if headline is None:
                raise ValueError("hero.headline ist erforderlich")
            self._ensure_str(headline, "hero.headline")
            if subline is not None:
                self._ensure_str(subline, "hero.subline")
            if image_url is not None:
                self._ensure_str(image_url, "hero.image_url")

        elif self.type == "text":
            text = self.props.get("text")
            if text is None:
                raise ValueError("text.text ist erforderlich")
            self._ensure_str(text, "text.text")

        elif self.type == "offer_grid":
            title = self.props.get("title")
            items = self.props.get("items")
            if title is None or items is None:
                raise ValueError("offer_grid.title und offer_grid.items sind erforderlich")
            self._ensure_str(title, "offer_grid.title")
            items_list = self._ensure_list(items, "offer_grid.items")
            for idx, it in enumerate(items_list):
                if not isinstance(it, dict):
                    raise ValueError(f"offer_grid.items[{idx}] muss dict sein")
                # Nur erlaubte Keys je Item
                item_allowed = {"sku", "title", "price"}
                unknown_item = set(it.keys()) - item_allowed
                if unknown_item:
                    raise ValueError(
                        f"Unerlaubte Keys in offer_grid.items[{idx}]: {sorted(unknown_item)}"
                    )
                sku = it.get("sku")
                title_i = it.get("title")
                price = it.get("price")
                if sku is None or title_i is None or price is None:
                    raise ValueError(f"offer_grid.items[{idx}] erfordert sku,title,price")
                self._ensure_str(sku, f"offer_grid.items[{idx}].sku")
                self._ensure_str(title_i, f"offer_grid.items[{idx}].title")
                self._ensure_number(price, f"offer_grid.items[{idx}].price")
        else:
            # Unbekannter Typ: keine Props erlaubt
            if self.props:
                raise ValueError(f"Blocktyp '{self.type}' erlaubt keine Props")


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
