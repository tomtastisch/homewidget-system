from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import ASGIApp

from ..core.logging_config import get_logger, request_id_var, user_id_var

"""Middleware für Request-/Response-Logging mit Latenz und Korrelations-IDs."""

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Loggt jeden Request und Response mit Latenz und Status.

    Injiziert eine request_id in die Logging-ContextVars, sodass alle Logs
    für einen gegebenen Request korreliert werden können.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.log = get_logger("api.middleware")

    async def dispatch(self, request: Request, call_next: Callable):
        rid = str(uuid.uuid4())
        token = request_id_var.set(rid)
        start = time.perf_counter()
        response: Response | None = None
        try:
            self.log.debug(
                "request", extra={"method": request.method, "path": request.url.path, "client": getattr(request.client, "host", None)}
            )
            response = await call_next(request)
            return response

        finally:
            duration_ms = int((time.perf_counter() - start) * 1000)
            status_code = response.status_code if response is not None else None
            self.log.info(
                "response",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": status_code,
                    "duration_ms": duration_ms,
                },
            )
            request_id_var.reset(token)
            # Kontext für Folge-Logs explizit zurücksetzen
            user_id_var.set(None)
