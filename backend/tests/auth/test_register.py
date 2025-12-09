from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any, TypeAlias

import pytest
from fastapi.testclient import TestClient

REGISTER_URL = "/api/auth/register"

JsonMapping: TypeAlias = Mapping[str, Any]


def _iter_detail_entries(data: JsonMapping | Any) -> Iterable[JsonMapping]:
    """Liefert Fehler-Einträge aus dem `detail`-Feld in vereinheitlichter Form.

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
    """Extrahiert fehlerhafte Feldnamen aus typischen Fehlerantworten.

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
    """Stellt sicher, dass ein Pflichtfeld korrekt als fehlerhaft gemeldet wird.

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
            "Erwarteter Fehler für '{field}' nicht gefunden oder kein 'missing'-Fehler: "
            f"{data}"
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