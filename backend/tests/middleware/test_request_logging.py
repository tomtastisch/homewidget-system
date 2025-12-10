from __future__ import annotations

from typing import Any, List

from loguru import logger


def test_request_logging_emits_request_and_response_with_ids_and_duration(client) -> None:
    # Arrange: capture loguru messages during the request
    captured: List[Any] = []

    def _sink(message):  # loguru Message
        captured.append(message)

    sink_id = logger.add(_sink, level="DEBUG")

    try:
        # Act
        resp = client.get("/health")
        assert resp.status_code == 200
    finally:
        logger.remove(sink_id)

    # Assert: find request and response logs
    request_logs = []
    response_logs = []
    for msg in captured:
        rec = msg.record
        # We rely on our adapter setting extra['logger'] to the full logger name
        if rec["extra"].get("logger") == "backend.app.api.middleware":
            if rec["message"] == "request":
                request_logs.append(rec)
            if rec["message"] == "response":
                response_logs.append(rec)

    assert len(request_logs) >= 1, "Expected at least one 'request' log entry"
    assert len(response_logs) >= 1, "Expected at least one 'response' log entry"

    req = request_logs[-1]
    res = response_logs[-1]

    # request has request_id and method/path
    assert req["extra"].get("request_id") is not None
    assert req["extra"].get("method") == "GET"
    assert req["extra"].get("path") == "/health"

    # response has request_id, duration_ms and status
    assert res["extra"].get("request_id") is not None
    assert isinstance(res["extra"].get("duration_ms"), int)
    assert res["extra"].get("status") == 200
