from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.utils import auth as auth_utils

pytestmark = pytest.mark.integration


def test_feed_v1_aggregator_fail_open_one_provider_raises(client: TestClient, monkeypatch) -> None:
    # Arrange: Login
    login_resp = auth_utils.register_and_login(client, "failopen@example.com", "Secret1234!")
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Ein Provider wirft absichtlich
    def mock_failing_load_items(*args, **kwargs) -> None:
        """Mock-Funktion, die absichtlich eine Exception wirft, um das Fail-Open-Verhalten zu testen."""
        raise RuntimeError("provider boom")

    monkeypatch.setattr(
        "app.homewidget.providers.furniture_provider.FurnitureProvider.load_items",
        mock_failing_load_items,
        raising=True,
    )

    # Act
    resp = client.get(
        "/api/home/feed_v1",
        headers=auth_utils.auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    # Assert: trotzdem nicht leer (MobilePlans liefert)
    ids = [it["id"] for it in data["items"]]
    assert set(ids) == {2001, 2002}, (
        "Die gelieferten IDs stimmen nicht exakt mit den erwarteten {2001, 2002} überein: "
        f"Gefunden: {ids}"
    )
