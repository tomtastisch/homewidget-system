"""In-Memory Rate-Limiting für API-Endpunkte."""
from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from time import time


@dataclass
class RateRule:
    """Rate-Limit-Regel: Maximalanzahl von Anfragen pro Zeitfenster."""
    count: int
    window_seconds: int


class InMemoryRateLimiter:
    """Einfacher In-Memory-Rate-Limiter basierend auf Sliding-Window."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, rule: RateRule) -> bool:
        """
        Prüft, ob eine Anfrage für den gegebenen Key erlaubt ist.

        Args:
            key: Eindeutiger Schlüssel (z.B. "login:ip:username").
            rule: Rate-Limit-Regel.

        Returns:
            True falls erlaubt, False falls Limit überschritten.
        """
        now = time()
        window_start = now - rule.window_seconds
        q = self._events[key]

        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= rule.count:
            return False

        q.append(now)
        return True

    def remaining(self, key: str, rule: RateRule) -> int:
        """
        Gibt die verbleibende Anzahl erlaubter Anfragen zurück.

        Args:
            key: Eindeutiger Schlüssel.
            rule: Rate-Limit-Regel.

        Returns:
            Anzahl verbleibender erlaubter Anfragen.
        """
        now = time()
        window_start = now - rule.window_seconds
        q = self._events[key]

        while q and q[0] < window_start:
            q.popleft()

        return max(0, rule.count - len(q))


def parse_rule(expr: str) -> RateRule:
    """
    Parst einen Rate-Limit-Ausdruck im Format "N/W" (N=Anzahl, W=Sekunden).

    Args:
        expr: Rate-Limit-Ausdruck (z.B. "5/60").

    Returns:
        RateRule-Instanz.

    Raises:
        ValueError: Falls Format ungültig ist.
    """
    parts = expr.split("/")
    if len(parts) != 2:
        raise ValueError("Invalid rate limit expression, expected 'N/W'")

    return RateRule(count=int(parts[0]), window_seconds=int(parts[1]))
