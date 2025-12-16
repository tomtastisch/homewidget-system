from __future__ import annotations

import os
import tempfile

from fastapi.testclient import TestClient

"""
Hinweis: `create_app` wird erst innerhalb des Tests importiert, nachdem
`DATABASE_URL` gesetzt wurde, damit die DB-Engine die neue URL übernimmt.
"""


def _login(client: TestClient, username: str, password: str) -> str:
    # OAuth2PasswordRequestForm erwartet Form-Encoded Daten
    resp = client.post(
        "/api/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    return data["access_token"]


def test_feed_returns_widgetread_list():
    # Frische isolierte DB pro Testlauf verwenden
    with tempfile.NamedTemporaryFile(prefix="hw_test_", suffix=".db", delete=True) as tmp:
        os.environ["DATABASE_URL"] = f"sqlite:///{tmp.name}"
        from app.main import create_app  # Import nach Setzen der ENV-Variablen
        test_app = create_app()
        with TestClient(test_app) as client:
            # Seed ist in Non-Prod automatisch aktiv; nutze Common-User aus Seed
            token = _login(client, "common@example.com", "common1234")

            resp = client.get(
                "/api/home/feed",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200, resp.text
            data = resp.json()
            assert isinstance(data, list)
            # Es kann 0 oder mehr Widgets geben; wenn vorhanden, prüfen wir exemplarische Felder
            if data:
                item = data[0]
                assert isinstance(item, dict)
                # Minimaler Satz typischer Felder aus WidgetRead
                # (Feldnamen sollen konsistent mit Schema bleiben; Test liefert frühes Signal)
                for key in ("id", "name", "title", "slot", "owner_id"):
                    assert key in item
