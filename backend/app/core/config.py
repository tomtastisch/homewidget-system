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
    # Default-ENV: in PyTest-Läufen automatisch "test", sonst "dev" (überschreibbar via ENV)
    ENV: str = os.getenv("ENV") or ("test" if os.getenv("PYTEST_CURRENT_TEST") else "dev")

    SECRET_KEY: str                  = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int   = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    ALGORITHM: str                   = "HS256"

    DATABASE_URL: str       = os.getenv("DATABASE_URL", "sqlite:///./homewidget.db")

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
