"""Tests for the health check endpoint (Ticket 1-E requirement)."""

from fastapi.testclient import TestClient


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    """Test that /health endpoint returns {"status": "ok"} with 200 status code."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
