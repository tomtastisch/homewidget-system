from __future__ import annotations

from typing import Tuple

from fastapi.testclient import TestClient
from httpx import Response

"""
Gemeinsame Test-Utilities für Auth-Flows.

Diese Utilities kapseln häufige Abläufe wie Registrieren, Login,
Token-Refresh, Logout und den Aufruf von geschützten Endpunkten.
"""


def auth_headers(token: str) -> dict[str, str]:
    """
    Erzeuge einen Authorization‑Header.

    Entfernt NICHT stillschweigend nicht‑ASCII‑Zeichen. Falls der Token nicht als
    ASCII encodiert werden kann, wird ein garantiert ungültiger Platzhalter gesetzt,
    damit die Testsemantik klar invalid ist.
    """
    value = f"Bearer {token}"
    try:
        value.encode("ascii")
    except UnicodeEncodeError:
        value = "Bearer INVALID-NON-ASCII-TOKEN"
    return {"Authorization": value}


def register(client: TestClient, email: str, password: str) -> Response:
    """Low‑Level: Registration Request. Rückgabe immer Response.

    Assertions zu Status/JSON erfolgen in den Tests.
    """
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )


def login(client: TestClient, email: str, password: str) -> Response:
    """Low‑Level: Login‑Request. Rückgabe immer Response."""
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
    )


def register_and_login(client: TestClient, email: str, password: str) -> Response:
    """
    Idempotenter Flow: Nutzer sicherstellen und einloggen.

    Baut auf der idempotenten Variante auf und liefert die Login‑Response.
    """
    ensure_user_exists(client, email, password)
    return login(client, email, password)


def refresh_tokens(client: TestClient, refresh_token: str) -> Response:
    """
    Refresh‑Request. Immer Response zurückgeben; Tests werten Status/JSON aus.
    """
    return client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )


def get_me(client: TestClient, access_token: str) -> Response:
    """Aufruf von /me mit Bearer‑Token. Rückgabe Response."""
    return client.get("/api/auth/me", headers=auth_headers(access_token))


def logout(client: TestClient, access_token: str) -> Response:
    """Logout‑Aufruf. Rückgabe Response."""
    return client.post("/api/auth/logout", headers=auth_headers(access_token))


def register_user(client: TestClient, email: str, password: str) -> Response:
    """
    Strikte Registrierung eines neuen Nutzers.

    Erwartet in der Regel Erfolg (z. B. 201/200). Kein 409 toleriert – die
    Auswertung erfolgt in den Tests.
    """
    return register(client, email, password)


def ensure_user_exists(client: TestClient, email: str, password: str) -> Response:
    """
    Idempotente Registrierung: akzeptiert 200/201/409.

    Liefert immer die Response der Register‑Anfrage; Tests entscheiden über
    zulässige Statuscodes.
    """
    return register(client, email, password)


def register_random_user(client: TestClient) -> Tuple[str, str, Response]:
    """
    Convenience‑Helper: erzeugt realistische E‑Mail/Passwort, stellt den Nutzer
    idempotent her und loggt ein. Rückgabe: (email, password, login_response)
    """
    from .emails import random_email
    from .passwords import valid_password

    email = random_email()
    password = valid_password()
    ensure_user_exists(client, email, password)
    login_resp = login(client, email, password)
    return email, password, login_resp
