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
from .core.logging_config import setup_logging
from .middleware.logging_middleware import RequestLoggingMiddleware


def create_app() -> FastAPI:
    # configure logging early
    setup_logging()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        init_db()
        FastAPICache.init(InMemoryBackend(), prefix="homewidget")
        yield

    app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

    # CORS for mobile dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request/Response logging middleware (enable/disable via env)
    if os.getenv("REQUEST_LOGGING_ENABLED", "1") not in ("0", "false", "False"):
        app.add_middleware(RequestLoggingMiddleware)

    app.include_router(auth_routes.router)
    app.include_router(widget_routes.router)
    app.include_router(home_routes.router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
