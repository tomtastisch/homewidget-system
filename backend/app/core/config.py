"""
Zentrale Konfiguration der Anwendung.
Lädt Einstellungen aus Umgebungsvariablen und stellt sie als Settings-Instanz bereit.
"""
from __future__ import annotations

import os
from datetime import timedelta


class Settings:
    """
    Konfigurationseinstellungen für das Backend.
    Alle Parameter können über Umgebungsvariablen überschrieben werden.
    """
    PROJECT_NAME: str = "homewidget-backend"
    # Default-ENV: in PyTest- oder CI-Läufen automatisch "test", sonst "dev" (überschreibbar via ENV)
    ENV: str = (
            os.getenv("ENV")
            or ("test" if (
                os.getenv("PYTEST_CURRENT_TEST") or os.getenv("CI") or os.getenv("GITHUB_ACTIONS")) else "dev")
    )

    SECRET_KEY: str                  = os.getenv("SECRET_KEY", "dev-secret-change-me")
    # Profil für Timing‑Konfiguration (prod|dev|e2e)
    HW_PROFILE: str = os.getenv("HW_PROFILE", "dev")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    ALGORITHM: str                   = "HS256"

    # Datenbank-URL. In nicht-prod Umgebungen auf eine schreibbare, temporäre
    # Default-Location lenken, um CI-Fehler wie "attempt to write a readonly database"
    # zu vermeiden. Kann weiterhin via ENV überschrieben werden.
    _DEFAULT_DB_DEV: str = "sqlite:///./homewidget.db"
    _DEFAULT_DB_TEST: str = "sqlite:////tmp/homewidget-e2e.db"

    # Heuristik: In Test/E2E/CI-Kontexten standardmäßig in /tmp schreiben,
    # um readonly-Probleme mit Repo-Dateien zu vermeiden.
    _IS_TEST_LIKE: bool = bool(
        (os.getenv("ENV") in {"test", "ci"})
        or os.getenv("PYTEST_CURRENT_TEST")
        or os.getenv("CI")
        or os.getenv("GITHUB_ACTIONS")
    )

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        _DEFAULT_DB_TEST if _IS_TEST_LIKE else _DEFAULT_DB_DEV,
    )

    LOGIN_RATE_LIMIT: str   = os.getenv("LOGIN_RATE_LIMIT", "5/60")
    FEED_RATE_LIMIT: str    = os.getenv("FEED_RATE_LIMIT", "60/60")
    REFRESH_RATE_LIMIT: str = os.getenv("REFRESH_RATE_LIMIT", "10/600")

    # CORS
    # Kommagetrennte Ursprünge, z. B. "http://localhost:19006,http://localhost:3000"
    _CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "*")

    @property
    def CORS_ORIGINS(self) -> list[str]:
        raw = self._CORS_ORIGINS_RAW.strip()
        if raw == "*" or raw == "":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def access_token_expire(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

    @property
    def refresh_token_expire(self) -> timedelta:
        return timedelta(days=self.REFRESH_TOKEN_EXPIRE_DAYS)


settings = Settings()
