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
    def raising(_self):  # type: ignore[no-untyped-def]
        raise RuntimeError("provider boom")

    monkeypatch.setattr(
        "app.homewidget.providers.furniture_provider.FurnitureProvider.load_items",
        raising,
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
    assert ids and set(ids).issubset({2001, 2002})
