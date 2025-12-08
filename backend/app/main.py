from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from .api.routes import auth as auth_routes
from .api.routes import home as home_routes
from .api.routes import widgets as widget_routes
from .core.config import settings
from .core.database import init_db


def create_app() -> FastAPI:
    app = FastAPI(title=settings.PROJECT_NAME)

    # CORS for mobile dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        init_db()
        FastAPICache.init(InMemoryBackend(), prefix="homewidget")

    app.include_router(auth_routes.router)
    app.include_router(widget_routes.router)
    app.include_router(home_routes.router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
