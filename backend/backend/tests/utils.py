from __future__ import annotations

from typing import Iterable

from fastapi.testclient import TestClient

LOGIN_URL = "/api/auth/login"
REGISTER_URL = "/api/auth/register"


def register_user(client: TestClient, email: str, password: str) -> dict:
    """Register a user and return response JSON. Expects success (200/201)."""
    resp = client.post(REGISTER_URL, json={"email": email, "password": password})
    assert resp.status_code in (200, 201)
    return resp.json()


def login_user(client: TestClient, email: str, password: str):
    """Perform OAuth2 password flow login. Returns the raw response for flexible assertions."""
    return client.post(
        LOGIN_URL,
        data={
            "username": email,
            "password": password,
        },
    )
