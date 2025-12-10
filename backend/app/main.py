from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from .api.routes import auth as auth_routes
from .api.routes import home as home_routes
from .api.routes import widgets as widget_routes
from .core.config import settings
from .core.database import init_db
from .core.logging_config import get_logger, setup_logging
from .middleware.logging_middleware import RequestLoggingMiddleware
from .services.token import cleanup_loop

"""
Einstiegspunkt für die FastAPI-Anwendung.
Konfiguriert Middleware, Router und Lifecycle-Events für das Backend.
"""

LOG = get_logger("lifecycle")


def create_app() -> FastAPI:
    """
    Erzeugt und konfiguriert die FastAPI-Anwendung.

    Returns:
        Vollständig konfigurierte FastAPI-Instanz mit Middleware, Routern und Lifecycle.
    """
    setup_logging()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        # DB & Cache initialisieren
        init_db()
        FastAPICache.init(InMemoryBackend(), prefix="homewidget")

        # Hintergrundtask für Token-Cleanup starten
        cleanup_task = asyncio.create_task(cleanup_loop())
        LOG.info("cleanup_loop_started")

        try:
            yield
        finally:
            # Task sauber beenden
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                LOG.info("cleanup_loop_stopped")

    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if os.getenv("REQUEST_LOGGING_ENABLED", "1") not in ("0", "false", "False"):
        app.add_middleware(RequestLoggingMiddleware)

    app.include_router(auth_routes.router)
    app.include_router(widget_routes.router)
    app.include_router(home_routes.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()