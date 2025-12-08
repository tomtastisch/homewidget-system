from collections import defaultdict, deque
from dataclasses import dataclass
from time import time


@dataclass
class RateRule:
    # count per window_seconds
    count: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        # key -> deque[timestamps]
        self._events: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, rule: RateRule) -> bool:
        now = time()
        window_start = now - rule.window_seconds
        q = self._events[key]
        # drop old
        while q and q[0] < window_start:
            q.popleft()
        if len(q) >= rule.count:
            return False
        q.append(now)
        return True

    def remaining(self, key: str, rule: RateRule) -> int:
        now = time()
        window_start = now - rule.window_seconds
        q = self._events[key]
        while q and q[0] < window_start:
            q.popleft()
        return max(0, rule.count - len(q))


def parse_rule(expr: str) -> RateRule:
    # format: "N/W" where N=count, W=seconds
    parts = expr.split("/")
    if len(parts) != 2:
        raise ValueError("Invalid rate limit expression, expected 'N/W'")
    return RateRule(count=int(parts[0]), window_seconds=int(parts[1]))
