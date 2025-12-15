"""Service zur Bereitstellung von Home-Feed-Widgets für Benutzer.

Selektion (HW-NEXT-01D):
- Filter:
  - enabled == True
  - visibility_rules matchen Benutzerkontext (demo/common/premium)
  - freshness_ttl abgelaufen => ausschließen (ttl <= 0 bedeutet: kein Ablauf)
- Sortierung: priority desc, created_at desc, id desc
Die Logik ist deterministisch; Zeitabhängigkeit kann in Tests per Time‑Freeze gesteuert werden.
"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from ..models.user import User
from ..models.widget import Widget


class HomeFeedService:
    """
    Service zum Abrufen von BackendWidget-Feeds für Benutzer.
    """

    def __init__(self, session: Session):
        self.session = session

    def get_user_widgets(self, user: User, *, now: datetime | None = None, context: str | None = None) -> Sequence[Widget]:
        """
        Liefert Widgets für einen Benutzer gemäß Selektion/Sortierung.

        Args:
            user: Benutzer, dessen Widgets abgerufen werden sollen.
            now: Referenzzeit (für Tests übersteuerbar). Default: aktuelle UTC‑Zeit.
            context: Sichtbarkeitskontext (PoC: demo/common/premium). Default: `user.role`.

        Returns:
            Deterministisch gefilterte und sortierte Folge von Widgets.
        """
        ref_now = now or datetime.now(tz=UTC)
        ctx = (context or getattr(user, "role", None) or "common")
        if hasattr(ctx, "value"):
            # Enum UserRole -> String nehmen
            ctx = getattr(ctx, "value")  # type: ignore[assignment]

        # Rohdaten laden (nur Besitzer einschränken); restliche Regeln in Python anwenden,
        # um DB‑Dialektunterschiede (JSON, Zeitarithmetik) in Tests zu vermeiden.
        candidates: Sequence[Widget] = self.session.exec(
            select(Widget).where(Widget.owner_id == user.id)
        ).all()

        def is_visible(w: Widget) -> bool:
            if not w.enabled:
                return False

            # Sichtbarkeit: leere Liste => sichtbar für alle
            rules = w.visibility_rules or []
            if rules and str(ctx) not in {str(r) for r in rules}:
                return False

            # TTL: nur anwenden, wenn ttl > 0
            ttl_sec = getattr(w, "freshness_ttl", 0) or 0
            if ttl_sec > 0:
                try:
                    expires_at = w.created_at + timedelta(seconds=int(ttl_sec))
                    if expires_at <= ref_now:
                        return False
                except (TypeError, ValueError, OverflowError):
                    # Bei unerwarteten Datumswerten defensiv: Widget ausschließen
                    return False

            return True

        visible = [w for w in candidates if is_visible(w)]

        # Deterministische Sortierung
        visible.sort(
            key=lambda w: (
                int(w.priority or 0),
                w.created_at,
                int(w.id or 0),
            ),
            reverse=True,
        )
        return visible
