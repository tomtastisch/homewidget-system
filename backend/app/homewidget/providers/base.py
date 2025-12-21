from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from ..contracts.v1.widget_contracts import WidgetContractV1


class ProviderBase(ABC):
    """Abstrakte Basis für Widget-Provider.

    Provider liefern eine Liste von ``WidgetContractV1`` Items. Der Aggregator
    übernimmt Sortierung und Pagination.
    """

    @property
    @abstractmethod
    def name(self) -> str:  # pragma: no cover - trivial
        """Lesbarer Name für Logging."""

    @abstractmethod
    def load_items(self) -> List[WidgetContractV1]:
        """Lädt alle verfügbaren Feed-Items dieses Providers.

        Fehler sollen hier nicht abgefangen werden; der Aggregator fängt sie
        fail-open ab und loggt.
        """
        raise NotImplementedError
