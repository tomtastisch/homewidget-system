"""
Integrationstest für den /health‑Endpoint. Dieser Test prüft, dass der
Health‑Check der API den erwarteten OK‑Status zurückgibt.
"""
from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

# Dieser Test verwendet den TestClient gegen die FastAPI‑App.
pytestmark = pytest.mark.integration


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    """Test that /health endpoint returns {"status": "ok"} with 200 status code."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
