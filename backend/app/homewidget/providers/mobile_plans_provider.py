from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List

from .base import ProviderBase
from ..contracts.v1.widget_contracts import WidgetContractV1


class MobilePlansProvider(ProviderBase):
    @property
    def name(self) -> str:  # pragma: no cover - trivial
        return "mobile_plans"

    def load_items(self) -> List[WidgetContractV1]:
        base = datetime(2024, 2, 1, 8, 0, 0, tzinfo=timezone.utc)
        return [
            WidgetContractV1(id=2001, name="Tarif M", priority=20, created_at=base + timedelta(days=2)),
            WidgetContractV1(id=2002, name="Tarif L", priority=25, created_at=base + timedelta(days=3)),
        ]
