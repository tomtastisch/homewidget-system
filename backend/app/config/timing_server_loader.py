"""
Loader und Validator für serverseitige Timing-Konfiguration.

Quelle: config/timing.server.json

Diese Datei enthält autoritative Security‑Timings (Access/Refresh‑TTL, Lockout,
RateLimit). Öffentliche Timings werden hier bewusst ignoriert.

Profilwahl: via ENV `HW_PROFILE` ("prod" | "dev" | "e2e").
Fail‑fast‑Validierung in Prod (Mindestwerte), um unsichere Konfigurationen zu verhindern.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from typing import TypedDict

from pydantic import BaseModel, Field, PositiveInt, ValidationError, field_validator


# ---------- Pydantic‑Modelle für Strict Validation ----------


class AuthTimings(BaseModel):
    accessTokenTtlMs: PositiveInt = Field(..., description="Lebenszeit des Access Tokens in Millisekunden")
    refreshTokenTtlMs: PositiveInt = Field(..., description="Lebenszeit des Refresh Tokens in Millisekunden")


class LockoutTimings(BaseModel):
    maxAttempts: PositiveInt = Field(..., description="Max. Fehlversuche bis Lockout")
    cooldownMs: int = Field(ge=0, description="Lockout‑Dauer in Millisekunden")


class RateLimitTimings(BaseModel):
    windowMs: PositiveInt = Field(..., description="Fenstergröße in Millisekunden")
    maxRequests: PositiveInt = Field(..., description="Max. Requests im Fenster")


class RateLimits(BaseModel):
    """Erlaubt separate RateLimits je Kontext.

    Wenn nur `default` angegeben ist, wird dieser für alle Kontexte genutzt.
    Optional können `login`, `refresh` und `feed` überschrieben werden.
    """
    default: RateLimitTimings
    login: RateLimitTimings | None = None
    refresh: RateLimitTimings | None = None
    feed: RateLimitTimings | None = None


class SecurityTimings(BaseModel):
    lockout: LockoutTimings
    # Backward‑compatible: akzeptiere entweder eine einzelne RateLimitTimings
    # oder strukturierte RateLimits mit Kontexten.
    rateLimit: RateLimitTimings | RateLimits


class ServerTimings(BaseModel):
    auth: AuthTimings
    security: SecurityTimings


class ProfileEnvelope(BaseModel):
    server: ServerTimings


class TimingServerFile(BaseModel):
    version: str
    profiles: dict[str, ProfileEnvelope]

    @field_validator("version")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("version must be non‑empty")
        return v


# ---------- Datenansicht und Hilfsfunktionen ----------


@dataclass(frozen=True)
class RateRuleView:
    count: int
    window_seconds: int


class ServerTimingsView(TypedDict):
    access_ttl: timedelta
    refresh_ttl: timedelta
    rate_rule: RateRuleView
    login_rate_rule: RateRuleView
    refresh_rate_rule: RateRuleView
    feed_rate_rule: RateRuleView
    lockout_max_attempts: int
    lockout_cooldown: timedelta


CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "timing.server.json"


def _active_env() -> str:
    # Fällt auf dev zurück, wenn nichts gesetzt ist
    return os.getenv("ENV") or "dev"


def _active_profile() -> str:
    return os.getenv("HW_PROFILE") or "dev"


def _enforce_prod_minimums(server: ServerTimings) -> None:
    """Erzwinge sinnvolle Mindestwerte in Prod.

    Aktuelle Regeln:
    - Access TTL >= 5 Minuten
    - Refresh TTL >= 7 Tage
    """
    if _active_env() != "prod":
        return

    min_access_ms = 5 * 60 * 1000
    min_refresh_ms = 7 * 24 * 60 * 60 * 1000

    if server.auth.accessTokenTtlMs < min_access_ms:
        raise ValueError("Prod minimum violated: accessTokenTtlMs must be >= 5 minutes")
    if server.auth.refreshTokenTtlMs < min_refresh_ms:
        raise ValueError("Prod minimum violated: refreshTokenTtlMs must be >= 7 days")


@lru_cache(maxsize=1)
def _load_raw() -> ServerTimings:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(f"timing.server.json not found at {CONFIG_PATH}")

    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        parsed = TimingServerFile.model_validate(data)
    except ValidationError as exc:  # pragma: no cover - validiert in Tests separat
        logging.getLogger("config.timing").error("timing_server_json_invalid", extra={"error": str(exc)})
        raise ValueError(f"Invalid timing.server.json: {exc}") from exc

    profile = _active_profile()
    if profile not in parsed.profiles:
        logging.getLogger("config.timing").error("timing_profile_missing", extra={"profile": profile})
        raise KeyError(f"Profile '{profile}' not found in timing.server.json")

    server = parsed.profiles[profile].server
    _enforce_prod_minimums(server)
    return server


def _to_view(server: ServerTimings) -> ServerTimingsView:
    def _rl_to_view(rl: RateLimitTimings) -> RateRuleView:
        return RateRuleView(count=int(rl.maxRequests), window_seconds=int(rl.windowMs // 1000))

    # Entweder eine globale Regel oder kontext-spezifische Regeln
    if isinstance(server.security.rateLimit, RateLimitTimings):
        global_rule = _rl_to_view(server.security.rateLimit)
        login_rule = refresh_rule = feed_rule = global_rule
    else:
        group: RateLimits = server.security.rateLimit
        global_rule = _rl_to_view(group.default)
        login_rule = _rl_to_view(group.login or group.default)
        refresh_rule = _rl_to_view(group.refresh or group.default)
        feed_rule = _rl_to_view(group.feed or group.default)

    return {
        "access_ttl": timedelta(milliseconds=server.auth.accessTokenTtlMs),
        "refresh_ttl": timedelta(milliseconds=server.auth.refreshTokenTtlMs),
        "rate_rule": global_rule,
        "login_rate_rule": login_rule,
        "refresh_rate_rule": refresh_rule,
        "feed_rate_rule": feed_rule,
        "lockout_max_attempts": int(server.security.lockout.maxAttempts),
        "lockout_cooldown": timedelta(milliseconds=server.security.lockout.cooldownMs),
    }


def get_active_server_timings() -> ServerTimingsView:
    """Gibt die Timings für das aktive Profil zurück (HW_PROFILE)."""
    return _to_view(_load_raw())


# Convenience‑Getter für Aufrufer, die konkrete Werte benötigen


def get_access_token_ttl() -> timedelta:
    try:
        return get_active_server_timings()["access_ttl"]
    except Exception:
        # Nicht-prod: Fallback auf statische Settings, um lokale Entwicklung/Tests robust zu halten
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("access_ttl_fallback_settings")
            # Lazy import, um Zyklen zu vermeiden
            from app.core.config import settings  # type: ignore

            return settings.access_token_expire
        raise


def get_refresh_token_ttl() -> timedelta:
    try:
        return get_active_server_timings()["refresh_ttl"]
    except Exception:
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("refresh_ttl_fallback_settings")
            from app.core.config import settings  # type: ignore

            return settings.refresh_token_expire
        raise


def get_global_rate_rule() -> RateRuleView:
    try:
        return get_active_server_timings()["rate_rule"]
    except Exception:
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("global_rate_rule_fallback_settings")
            from app.core.config import settings  # type: ignore

            return _parse_rate_rule_expr(settings.FEED_RATE_LIMIT)
        raise


def get_login_rate_rule() -> RateRuleView:
    try:
        return get_active_server_timings()["login_rate_rule"]
    except Exception:
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("login_rate_rule_fallback_settings")
            from app.core.config import settings  # type: ignore

            return _parse_rate_rule_expr(settings.LOGIN_RATE_LIMIT)
        raise


def get_refresh_rate_rule() -> RateRuleView:
    try:
        return get_active_server_timings()["refresh_rate_rule"]
    except Exception:
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("refresh_rate_rule_fallback_settings")
            from app.core.config import settings  # type: ignore

            return _parse_rate_rule_expr(settings.REFRESH_RATE_LIMIT)
        raise


def get_feed_rate_rule() -> RateRuleView:
    try:
        return get_active_server_timings()["feed_rate_rule"]
    except Exception:
        if _active_env() != "prod":
            logging.getLogger("config.timing").warning("feed_rate_rule_fallback_settings")
            from app.core.config import settings  # type: ignore

            return _parse_rate_rule_expr(settings.FEED_RATE_LIMIT)
        raise


def _parse_rate_rule_expr(expr: str) -> RateRuleView:
    """Hilfsfunktion: parst "N/W" in eine RateRuleView.

    Beispiel: "10/60" -> 10 Requests pro 60 Sekunden.
    """
    try:
        count_str, window_str = expr.split("/")
        return RateRuleView(count=int(count_str), window_seconds=int(window_str))
    except Exception as exc:  # pragma: no cover - defensive fallback
        logging.getLogger("config.timing").error("invalid_rate_limit_expr", extra={"expr": expr})
        # Sehr großzügiger Fallback in dev/test
        return RateRuleView(count=1000, window_seconds=60)
