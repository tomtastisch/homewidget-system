from __future__ import annotations

from datetime import UTC, datetime, timedelta


class TimeUtil:
    """
    Gemeinsamer, deterministischer Zeitanker für Tests.

    - `anchor` ist das referenzielle now (UTC, tz‑aware).
    - Alle abgeleiteten Zeitpunkte sind relativ zu `anchor`.
    """

    def __init__(self, now: datetime | None = None):
        self.anchor: datetime = now or datetime.now(tz=UTC)

    # Basiswerte
    def now(self) -> datetime:
        return self.anchor

    def past(self, *, days: int = 0, hours: int = 0, minutes: int = 0, seconds: int = 0) -> datetime:
        return self.anchor - timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)

    def future(self, *, days: int = 0, hours: int = 0, minutes: int = 0, seconds: int = 0) -> datetime:
        return self.anchor + timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)

    # TTL‑spezifische Hilfen für Widget.created_at
    def created_at_valid_for_ttl(self, ttl_seconds: int) -> datetime:
        """
        Liefert ein `created_at`, das zum Zeitpunkt `anchor` noch GÜLTIG ist.
        Regel im Code: abgelaufen, wenn (created_at + ttl) <= now → hier strikt > now.
        """
        if ttl_seconds <= 0:
            # 0 oder negativ bedeutet „kein Ablauf“ – jeder Wert ist ok; wir nehmen anchor
            return self.anchor
        # knapp innerhalb der Gültigkeit (ttl - 1s)
        delta = max(ttl_seconds - 1, 0)
        return self.anchor - timedelta(seconds=delta)

    def created_at_expired_for_ttl(self, ttl_seconds: int) -> datetime:
        """
        Liefert ein `created_at`, das zum Zeitpunkt `anchor` sicher ABGELAUFEN ist.
        Regel im Code: abgelaufen, wenn (created_at + ttl) <= now → also <= now erzwingen.
        """
        if ttl_seconds <= 0:
            # Für „kein Ablauf“ erzwingen wir optional ein weit in der Vergangenheit
            # liegendes Datum, falls Tests das explizit benötigen.
            return self.anchor - timedelta(days=365 * 50)
        # 1 Sekunde über die Grenze hinaus → sicher abgelaufen
        return self.anchor - timedelta(seconds=ttl_seconds + 1)


def test_time(now: datetime | None = None) -> TimeUtil:
    """Einfache Fabrikfunktion."""
    return TimeUtil(now)
