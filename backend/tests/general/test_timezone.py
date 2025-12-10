"""
Integrationstests für `ensure_utc_aware`, um konsistente UTC-Zeitpunkte sicherzustellen
und Fehler bei Vergleichen zwischen naiven und timezone-aware Datumswerten zu vermeiden.
"""
from __future__ import annotations


from datetime import UTC, datetime

import pytest

from app.services.auth_service import ensure_utc_aware

pytestmark = pytest.mark.integration

def test_ensure_utc_aware_with_naive_datetime() -> None:
    now = datetime.now()
    naive_dt = datetime(now.year, now.month, now.day, 12, 0, 0)
    assert naive_dt.tzinfo is None

    aware_dt = ensure_utc_aware(naive_dt)

    assert aware_dt.tzinfo is not None
    assert aware_dt.tzinfo == UTC
    assert aware_dt.year == now.year
    assert aware_dt.month == now.month
    assert aware_dt.day == now.day


def test_ensure_utc_aware_with_aware_datetime() -> None:
    now = datetime.now()
    aware_dt = datetime(now.year, now.month, now.day, 12, 0, 0, tzinfo=UTC)
    assert aware_dt.tzinfo == UTC

    result_dt = ensure_utc_aware(aware_dt)

    assert result_dt.tzinfo == UTC
    assert result_dt == aware_dt


def test_ensure_utc_aware_comparison() -> None:
    """Stellt sicher, dass Vergleiche nach der Konvertierung nicht an naive/aware-Kollisionen scheitern."""
    # Simulation SQLite: timezone-aware Datetime wird beim Lesen „naiv“

    now_naive = datetime.now()
    stored_dt = datetime(
        now_naive.year,
        now_naive.month,
        now_naive.day,
        12,
        0,
        0,
    )  # Naiv, wie aus SQLite gelesen
    now = datetime.now(tz=UTC)

    # Ohne ensure_utc_aware würde ein TypeError ausgelöst
    stored_aware = ensure_utc_aware(stored_dt)

    # Vergleiche dürfen keinen TypeError auslösen
    assert isinstance(stored_aware < now, bool)
    assert isinstance(stored_aware > now, bool)