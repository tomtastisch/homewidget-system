from __future__ import annotations

from datetime import UTC, datetime
from typing import Final

from fastapi_cache import FastAPICache

from ..core.logging_config import get_logger
from .auth_service import ensure_utc_aware

LOG = get_logger("services.token_blacklist")

_KEY_PREFIX: Final[str] = "token_blacklist"


def _key_for_jti(jti: str) -> str:
    return f"{_KEY_PREFIX}:{jti}"


async def blacklist_access_token(jti: str, expires_at: datetime) -> None:
    """
    Fügt den gegebenen Access-Token (jti) zur Blacklist bis expires_at hinzu.

    Cache-Backend: Nutzt das aktuell konfigurierte fastapi-cache2-Backend (InMemory in Dev).
    Verhalten: Fail-open falls Cache nicht verfügbar (loggt Warnung), da Access-Tokens
    kurzlebig sind und die DB für Refresh-Tokens die Source-of-Truth bleibt. Dies hält
    die API verfügbar, falls der Cache temporär ausfällt.
    Limitierungen: Nicht cluster-/persistenzsicher mit In-Memory-Backend; Einträge gehen
    bei Prozess-Neustart verloren.

    Args:
        jti: JWT-ID des Tokens.
        expires_at: Ablaufzeitpunkt des Tokens.
    """
    try:
        backend = FastAPICache.get_backend()

    except Exception as exc:
        LOG.warning("blacklist_no_cache_backend", exc_info=exc)
        return

    now = datetime.now(tz=UTC)
    exp_at = ensure_utc_aware(expires_at)
    ttl_seconds = int((exp_at - now).total_seconds())

    if ttl_seconds < 0:
        ttl_seconds = 0

    key = _key_for_jti(jti)

    try:
        await backend.set(key, b"1", expire=ttl_seconds)
        LOG.info("token_blacklisted", extra={"jti": jti, "ttl": ttl_seconds})

    except Exception as exc:
        LOG.warning("blacklist_set_failed", extra={"jti": jti}, exc_info=exc)


async def is_access_token_blacklisted(jti: str) -> bool:
    """
    Prüft, ob die gegebene jti auf der Blacklist steht.

    Fail-open bei Cache-Fehlern (behandelt als nicht blacklisted), um Verfügbarkeit
    zu erhalten.

    Args:
        jti: JWT-ID des zu prüfenden Tokens.

    Returns:
        True falls blacklisted, sonst False.
    """
    try:
        backend = FastAPICache.get_backend()

    except Exception as exc:
        LOG.warning("blacklist_no_cache_backend", exc_info=exc)
        return False

    try:
        value = await backend.get(_key_for_jti(jti))
        hit = bool(value)
        if hit:
            LOG.info("token_blacklist_hit", extra={"jti": jti})

        return hit

    except Exception as exc:
        LOG.warning("blacklist_get_failed", extra={"jti": jti}, exc_info=exc)
        return False
