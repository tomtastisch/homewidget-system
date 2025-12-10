from __future__ import annotations

from collections.abc import Iterable
from typing import Final

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings, strategies as st
from sqlmodel import select

from app.models.user import User, UserRole
from tests.utils import auth as auth_utils

"""
Property‑based Security‑Tests rund um Token‑Verifikation und Rollen.

Einsatz von hypothesis zur Erzeugung ungültiger/manipulierter Token‑Strings
und zur Validierung von Rollen‑Randfällen (demo/common/premium).
"""
pytestmark = pytest.mark.integration

# Beschränke auf druckbare ASCII-Zeichen ohne Steuerzeichen/Leerzeichen/Punkt,
# damit Header-Konstruktion stabil bleibt und nicht an CR/LF scheitert.
INVALID_ASCII: Final = st.text(
    alphabet=st.characters(min_codepoint=33, max_codepoint=126, blacklist_characters=". \r\n\t"),
    min_size=1,
    max_size=64,
)


@settings(max_examples=30, deadline=None)
@given(raw=INVALID_ASCII)
def test_me_rejects_arbitrary_non_jwt_strings(client: TestClient, raw: str) -> None:
    """
    Beliebige Nicht‑JWT‑Strings (ohne Punkte in Header.Payload.Signature‑Form) werden abgelehnt.
    """
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw}"})
    assert resp.status_code == 401


def _mutate_token(token: str) -> Iterable[str]:
    """Erzeugt leicht veränderte Varianten eines Tokens (ein Zeichen geändert)."""
    if not token:
        return []

    for i, ch in enumerate(token):
        # Wähle ein alternatives Zeichen aus gängigem Set
        alt = "A" if ch != "A" else "B"
        yield token[:i] + alt + token[i + 1:]

    return None


def test_me_rejects_mutated_access_token(client: TestClient) -> None:
    """
    Eine kleine Veränderung (Bit‑Flip auf Zeichenebene) eines gültigen Access‑Tokens
    muss zur Ablehnung führen.
    """
    login_data = auth_utils.register_and_login(client, "mutate@example.com", "SecurePassword123!").json()
    valid_token = login_data["access_token"]

    # Prüfe einige deterministische Mutationen
    for mutated in list(_mutate_token(valid_token))[:10]:
        resp = auth_utils.get_me(client, mutated)
        assert resp.status_code == 401


@settings(max_examples=20, deadline=None)
@given(ws=st.text(min_size=1, max_size=3).map(lambda s: " " + s + " "))
def test_me_rejects_token_with_surrounding_whitespace(client: TestClient, ws: str) -> None:
    login_data = auth_utils.register_and_login(client, "spacey@example.com", "SecurePassword123!").json()
    token = ws + login_data["access_token"] + ws
    resp = auth_utils.get_me(client, token)
    assert resp.status_code == 401


@settings(max_examples=25, deadline=None)
@given(raw=INVALID_ASCII)
def test_refresh_rejects_arbitrary_strings(client: TestClient, raw: str) -> None:
    resp = client.post("/api/auth/refresh", json={"refresh_token": raw})
    # Gültige Random‑Strings sind extrem unwahrscheinlich; erwarten 401
    assert resp.status_code == 401


def test_roles_reflected_on_login(client: TestClient, db_session) -> None:  # type: ignore[no-redef]
    """
    Für die drei Rollen (demo/common/premium) wird geprüft, dass nach Setzen der Rolle
    am Benutzerdatensatz die Login‑Antwort diese korrekt reflektiert.
    """
    email = "roles-check@example.com"
    password = "SecurePassword123!"
    # Benutzer anlegen
    auth_utils.register(client, email, password)

    def _set_role(role: UserRole) -> None:
        user = db_session.exec(select(User).where(User.email == email)).one()
        user.role = role
        db_session.add(user)
        db_session.commit()

    for role in (UserRole.demo, UserRole.common, UserRole.premium):
        _set_role(role)
        data = auth_utils.login(client, email, password).json()
        assert data.get("role") == role.value
