from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import or_
from sqlmodel import Session, delete

from app.core.database import engine
from app.core.logging_config import get_logger
from app.models.widget import RefreshToken

LOG = get_logger("services.maintenance")


def purge_expired_refresh_tokens(
        session: Session,
        *,
        now: Optional[datetime] = None,
) -> int:
    """
    Löscht abgelaufene oder widerrufene Refresh-Tokens.

    Args:
        session: Aktive DB-Session.
        now: Optional fixer Zeitpunkt für Tests (Default: aktuelles UTC-Datum).

    Returns:
        Anzahl gelöschter Datensätze.
    """
    if now is None:
        now = datetime.now(tz=UTC)

    stmt = delete(RefreshToken).where(
        or_(
            RefreshToken.expires_at < now,  # type: ignore[arg-type]
            RefreshToken.revoked.is_(True),  # type: ignore[attr-defined]  # noqa: E712
        )
    )

    result = session.exec(stmt)
    session.commit()
    deleted = result.rowcount or 0

    LOG.info("purged_refresh_tokens", extra={"count": deleted})
    return deleted


async def cleanup_loop(
        interval_seconds: int = 3600,
        *,
        max_runs: int | None = None,
) -> None:
    """
    Periodischer Cleanup-Loop für Refresh-Tokens.

    In Produktion ohne `max_runs` verwenden (endloser Loop).
    In Tests `max_runs` setzen, damit der Task terminieren kann.

    Args:
        interval_seconds: Pause zwischen zwei Durchläufen.
        max_runs: Optionale Begrenzung der Anzahl Durchläufe (nur Tests).
    """
    runs = 0

    while True:
        try:
            with Session(engine) as session:
                purge_expired_refresh_tokens(session)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("purge_failed", exc_info=exc)

        runs += 1
        if max_runs is not None and runs >= max_runs:
            break

        await asyncio.sleep(interval_seconds)
