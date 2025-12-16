from __future__ import annotations

"""
Test-Utilities für Timing‑Werte und zeitabhängige Tests.

Verwendet ausschließlich die Loader‑API, keine direkten JSON‑Reads.
"""

from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Iterator

from freezegun import freeze_time as _freeze_time

from app.config.timing_server_loader import (
    get_access_token_ttl,
    get_refresh_token_ttl,
    get_global_rate_rule,
    get_active_server_timings,
)


def server_timings():
    """Gibt die aktiven Server‑Timings (vereinfachte View) zurück."""
    return get_active_server_timings()


def access_ttl_seconds() -> int:
    return int(get_access_token_ttl().total_seconds())


def refresh_ttl_seconds() -> int:
    return int(get_refresh_token_ttl().total_seconds())


def rate_rule():
    return get_global_rate_rule()


def now_utc() -> datetime:
    return datetime.now(tz=UTC)


@contextmanager
def freeze_time(dt: datetime | str) -> Iterator[None]:
    """
    Kontextmanager zum Einfrieren der Zeit ohne Sleeps.

    Args:
        dt: Zielzeitpunkt (datetime mit TZ oder ISO‑String).
    """
    with _freeze_time(dt):
        yield
