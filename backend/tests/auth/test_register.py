from __future__ import annotations

from collections.abc import Iterable, Mapping, Callable
from typing import Any, TypeAlias

import pytest
from fastapi.testclient import TestClient

from ..utils.emails import email_for_user, invalid_email_missing_at
from ..utils.passwords import valid_password

REGISTER_URL = "/api/auth/register"

JsonMapping: TypeAlias = Mapping[str, Any]

"""
Integrationstests für die Registrierung: Diese Datei enthält sowohl
Validierungstests für fehlende/ungültige Felder als auch Happy‑Path‑Tests.
Die Tests verwenden Hilfsfunktionen aus utils.passwords und utils.emails für
zufällige und deterministische Testdaten.
"""
pytestmark = pytest.mark.integration


def _iter_detail_entries(data: JsonMapping | Any) -> Iterable[JsonMapping]:
    """
    Liefert Fehler-Einträge aus dem `detail`-Feld in vereinheitlichter Form.

    Unterstützte Varianten (typisch FastAPI/Pydantic):
    - {"detail": [{"loc": [...], "msg": "..."}, ...]}
    - {"detail": {"loc": [...], "msg": "..."}}
    Andere Strukturen werden ignoriert.
    """
    if not isinstance(data, Mapping):
        return

    detail = data.get("detail")

    match detail:
        case list() as items:
            for item in items:
                if isinstance(item, Mapping):
                    yield item

        case Mapping() as item:
            yield item
        case _:
            return


def _extract_invalid_fields(data: JsonMapping | Any) -> set[str]:
    """
    Extrahiert fehlerhafte Feldnamen aus typischen Fehlerantworten.

    Unterstützte Antwortformen (typisch FastAPI/Pydantic):
    - {"detail": [{"loc": [.., "field"], "msg": "..."}, ...]}
    - {"detail": {"field": "message", ...}}
    - {"errors": {"field": "message", ...}}

    Rückgabe: Menge der erkannten Feldnamen (z. B. {"email", "password"}).
    """
    if not isinstance(data, Mapping):
        return set()

    fields: set[str] = set()

    # detail-basierte Fehler
    for entry in _iter_detail_entries(data):
        loc = entry.get("loc")
        match loc:
            case [*_, str(last)]:
                fields.add(last)

            case str(name):
                fields.add(name)

            case _:
                pass

    # errors-basierte Fehler: {"errors": {"field": "message", ...}}
    errors = data.get("errors")
    if isinstance(errors, Mapping):
        for key in errors:
            if isinstance(key, str):
                fields.add(key)

    return fields


def _has_missing_field_error(data: JsonMapping | Any) -> bool:
    """Prüft, ob mindestens ein „missing“/„Field required“-Fehler vorliegt."""
    if not isinstance(data, Mapping):
        return False

    for entry in _iter_detail_entries(data):
        match entry:
            case {"type": "missing"}:
                return True

            case {"msg": str(msg)} if "Field required" in msg:
                return True

            case _:
                continue

    return False


def _assert_required_field_error(
        data: JsonMapping,
        payload: JsonMapping,
        field: str,
) -> None:
    """
    Stellt sicher, dass ein Pflichtfeld korrekt als fehlerhaft gemeldet wird.

    Regeln:
    - fehlt das Feld im Payload -> Feld muss als invalid gemeldet sein
    - ist das Feld leer ("") -> entweder Feld explizit invalid oder allgemeiner missing-Fehler
    """
    invalid_fields = _extract_invalid_fields(data)
    has_missing_error = _has_missing_field_error(data)

    if field not in payload:
        assert field in invalid_fields, (
            f"Erwarteter Fehler für '{field}' nicht gefunden: {data}"
        )

    elif payload.get(field) == "":
        assert field in invalid_fields or has_missing_error, (
            f"Erwarteter Fehler für '{field}' nicht gefunden oder kein 'missing'-Fehler: {data}"
        )


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"email": ""},
        {"password": ""},
    ],
)
def test_register_rejects_empty_input(
        client: TestClient,
        payload: dict[str, Any],
) -> None:
    """Registrierung mit leerem oder inhaltlich leerem Payload muss scheitern."""
    response = client.post(REGISTER_URL, json=payload)

    assert response.status_code in (400, 422)
    data = response.json()
    assert isinstance(data, dict)

    _assert_required_field_error(data, payload, "email")
    _assert_required_field_error(data, payload, "password")


@pytest.mark.parametrize(
    "missing_field,payload",
    [
        ("email", {"password": "VerySecurePassword123!"}),
        ("password", {"email": "single-field@example.com"}),
    ],
)
def test_register_missing_single_field(
        client: TestClient,
        missing_field: str,
        payload: dict[str, Any],
) -> None:
    """Registrierung mit genau einem fehlenden Pflichtfeld muss gezielt fehlschlagen."""
    response = client.post(REGISTER_URL, json=payload)

    assert response.status_code in (400, 422)
    data = response.json()
    assert isinstance(data, dict)

    invalid_fields = _extract_invalid_fields(data)

    assert missing_field in invalid_fields, (
        f"Fehlendes Feld '{missing_field}' muss im Fehlerreport stehen. Report: {data}"
    )

    other_field = "password" if missing_field == "email" else "email"
    assert other_field not in invalid_fields, (
        f"Unerwarteter Fehler für '{other_field}' im Report: {data}"
    )

# Weitere Integrationstests für die Registrierung und verwandte Endpunkte.
# Diese Tests prüfen den Happy‑Path, die alternative /signup‑Route,
# doppeltes Registrieren (inklusive case‑Insensitive) sowie ungültige
# E‑Mail‑Adressen.

def test_register_happy_path(client: TestClient) -> None:
    """Registrierung mit korrekten Daten liefert die erwarteten Felder."""
    email = email_for_user(10)
    password = valid_password()
    response = client.post(
        REGISTER_URL,
        json={"email": email, "password": password},
    )

    assert response.status_code in (200, 201)
    data = response.json()

    assert data["email"] == email
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_signup_endpoint_works(client: TestClient) -> None:
    """Die alternative Route /api/auth/signup funktioniert wie die Registrierung."""
    email = email_for_user(11)
    password = valid_password()
    response = client.post(
        "/api/auth/signup",
        json={"email": email, "password": password},
    )
    assert response.status_code in (200, 201)
    data = response.json()
    assert data["email"] == email
    assert data["is_active"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(
        client: TestClient,
        register_user: Callable[[str, str], Any],
) -> None:
    """Eine doppelte Registrierung mit derselben E‑Mail sollte 409 liefern."""
    email = email_for_user(12)
    password1 = valid_password()
    password2 = valid_password()

    # Erste Registrierung
    register_user(email, password1)

    # Zweite Registrierung mit derselben E‑Mail-Adresse
    response = client.post(
        REGISTER_URL,
        json={"email": email, "password": password2},
    )
    assert response.status_code == 409
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email(client: TestClient) -> None:
    """Ungültige E‑Mail‑Adressen (ohne @) sollen abgelehnt werden."""
    email = invalid_email_missing_at()
    password = valid_password()
    response = client.post(
        REGISTER_URL,
        json={"email": email, "password": password},
    )
    assert response.status_code == 422


def test_register_duplicate_email_case_insensitive_returns_409(client: TestClient) -> None:
    """Mehrfache Registrierung ist bei E‑Mails case‑insensitive und führt zu 409."""
    # Erste Registrierung mit gemischter Groß-/Kleinschreibung
    response1 = client.post(
        REGISTER_URL,
        json={"email": "CaseSensitive@Example.com", "password": valid_password()},
    )
    assert response1.status_code in (200, 201)
    # Zweite Registrierung mit der kleingeschriebenen Variante
    response2 = client.post(
        REGISTER_URL,
        json={"email": "casesensitive@example.com", "password": valid_password()},
    )
    assert response2.status_code == 409