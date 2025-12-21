from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .base import ProviderBase
from ...core.logging_config import get_logger
from ..contracts.v1.widget_contracts import FeedPageV1, WidgetContractV1

LOG = get_logger("providers.aggregator")


@dataclass
class ProvidersAggregator:
    providers: List[ProviderBase]

    def load_page(self, cursor: int = 0, limit: int = 20) -> FeedPageV1:
        # Parameter normalisieren
        if limit < 1:
            limit = 1
        if limit > 100:
            limit = 100
        if cursor < 0:
            cursor = 0

        all_items: list[WidgetContractV1] = []
        for p in self.providers:
            try:
                raw_items = p.load_items()
                # Strenge Validierung gegen den Contract: Ungültige Widgets droppen
                valid_items = []
                for raw in raw_items:
                    try:
                        valid_items.append(WidgetContractV1.model_validate(raw))
                    except Exception as ve:
                        LOG.error("widget_validation_failed", extra={"provider": p.name, "error": str(ve)})

                LOG.info("provider_ok", extra={"provider": p.name, "count": len(valid_items), "dropped": len(raw_items) - len(valid_items)})
                all_items.extend(valid_items)
            except Exception as exc:  # noqa: BLE001
                LOG.warning("provider_failed", extra={"provider": p.name, "error": str(exc)})

        # Deduplizieren nach ID (letzter gewinnt)
        by_id: dict[int, WidgetContractV1] = {}
        for it in all_items:
            by_id[it.id] = it

        merged: list[WidgetContractV1] = list(by_id.values())

        # Sortierung analog Contract: priority desc, created_at desc, id desc
        merged.sort(key=lambda x: (x.priority, x.created_at, x.id), reverse=True)

        rows = merged[cursor: cursor + limit + 1]
        has_more = len(rows) > limit
        items_page = rows[:limit]
        next_cursor = cursor + limit if has_more else None

        LOG.info(
            "aggregator_delivered",
            extra={"providers": [p.name for p in self.providers], "total": len(merged), "page_count": len(items_page)},
        )

        return FeedPageV1(items=items_page, next_cursor=next_cursor)
