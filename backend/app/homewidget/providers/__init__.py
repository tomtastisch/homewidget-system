"""Provider-Architektur für den v1-Feed (Aggregations-PoC).

Ordner enthält:
- base: Basisschnittstelle für Provider
- aggregator: Aggregator, der mehrere Provider zusammenführt (fail-open)
- demo provider: einfache Demo-Provider, die stabile Widgets liefern
"""

from __future__ import annotations

from .aggregator import ProvidersAggregator
from .base import ProviderBase

__all__ = ["ProviderBase", "ProvidersAggregator"]
