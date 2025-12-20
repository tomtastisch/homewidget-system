from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List

from .base import ProviderBase
from ..contracts.v1.widget_contracts import WidgetContractV1


class FurnitureProvider(ProviderBase):
    @property
    def name(self) -> str:  # pragma: no cover - trivial
        return "furniture"

    def load_items(self) -> List[WidgetContractV1]:
        base = datetime(2024, 2, 5, 8, 0, 0, tzinfo=timezone.utc)
        return [
            WidgetContractV1(id=2101, name="Sofa Classic", priority=15, created_at=base + timedelta(days=1)),
            WidgetContractV1(id=2102, name="Desk Pro", priority=18, created_at=base + timedelta(days=2)),
        ]
