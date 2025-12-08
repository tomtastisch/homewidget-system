from __future__ import annotations

import time
import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from ..core.logging_config import get_logger, request_id_var, user_id_var


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs each request and response with latency and status.

    Injects a request_id into the logging contextvars so all logs
    for a given request can be correlated.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.log = get_logger("api.middleware")

    async def dispatch(self, request: Request, call_next: Callable):
        rid = str(uuid.uuid4())
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            self.log.debug(
                "request", extra={"method": request.method, "path": request.url.path, "client": getattr(request.client, "host", None)}
            )
            response = await call_next(request)
            return response
        finally:
            # compute latency and log response
            duration_ms = int((time.perf_counter() - start) * 1000)
            try:
                status_code = getattr(locals().get("response", None), "status_code", None)
            except Exception:
                status_code = None
            self.log.info(
                "response",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": status_code,
                    "duration_ms": duration_ms,
                },
            )
            # Always reset request id
            request_id_var.reset(token)
            # Clear user context for safety
            try:
                user_id_var.set(None)
            except Exception:
                pass
