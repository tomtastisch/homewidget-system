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
from .api.routes import home_demo as home_demo_routes
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

    # Guardrail: Prod darf nur mit HW_PROFILE=prod starten (Fail‑fast)
    if settings.ENV == "prod":
        hw_profile = settings.HW_PROFILE
        ci_flag = os.getenv("CI") in {"1", "true", "True"}
        if not (hw_profile == "prod" or (hw_profile == "e2e" and ci_flag)):
            raise RuntimeError(
                "Guardrail violated: ENV=prod requires HW_PROFILE=prod (or HW_PROFILE=e2e with CI)."
            )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        # DB & Cache initialisieren
        init_db()
        FastAPICache.init(InMemoryBackend(), prefix="homewidget")

        # E2E/Contract-Tests benötigen deterministische Seed-Daten (Demo/Common/Premium Benutzer + Widgets).
        # Führe das idempotente Seeding automatisch aus, wenn wir in Test-Umgebung laufen
        # oder explizit per ENV aktiviert wurden. Dies verhindert 401 bei Login mit Demo-Credentials
        # in lokalen/CI-Contracttests, wenn kein separater Seed-Schritt ausgeführt wird.
        try:
            # In allen Nicht-Prod-Umgebungen automatisch seeden (idempotent),
            # oder wenn explizit per ENV angefordert.
            if settings.ENV != "prod" or os.getenv("E2E_AUTO_SEED") in {"1", "true", "True"}:
                from .initial_data_e2e import run as run_e2e_seed  # local import to avoid import cycles

                run_e2e_seed()
                LOG.info("e2e_seed_applied")
        except Exception:  # pragma: no cover - Seeding darf den Start nicht verhindern
            LOG.exception("e2e_seed_failed")

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
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if os.getenv("REQUEST_LOGGING_ENABLED", "1") not in ("0", "false", "False"):
        app.add_middleware(RequestLoggingMiddleware)

    app.include_router(auth_routes.router)
    app.include_router(widget_routes.router)
    app.include_router(home_routes.router)
    app.include_router(home_demo_routes.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Lightweight global exception instrumentation for non‑prod to aid CI diagnostics
    if settings.ENV != "prod" and os.getenv("ENABLE_DEV_GLOBAL_ERRORS", "1") not in ("0", "false", "False"):
        from fastapi import Request
        from fastapi.responses import JSONResponse
        import traceback

        @app.exception_handler(Exception)  # type: ignore[misc]
        async def _global_exception_handler(request: Request, exc: Exception):  # noqa: ANN001
            # Print a concise traceback to logs to surface root causes of 500s in CI
            LOG.error(
                "unhandled_exception",
                extra={"url": str(request.url)},
                exc_info=exc,
            )
            # Also include first line of traceback in response detail for quick signal (non‑prod only)
            tb = traceback.format_exc(limit=1)
            return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "_trace": tb})

    return app


app = create_app()