from __future__ import annotations

import concurrent.futures
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.utils import auth as auth_utils

"""
Tests für parallele Token-Refresh-Operationen (AUTH-09 Race-Condition).

Diese Tests validieren, dass der Mutex-Mechanismus korrekt funktioniert und
Race-Conditions bei gleichzeitigen Refresh-Anfragen verhindert werden.
"""
pytestmark = pytest.mark.integration


def test_parallel_refresh_with_same_token_one_succeeds_others_fail(client: TestClient) -> None:
    """
    Parallele Refresh-Anfragen mit demselben Token: Nur eine darf erfolgreich sein.

    Dieser Test validiert das Mutex-Verhalten:
    - Mehrere Threads versuchen gleichzeitig, denselben Refresh-Token zu rotieren
    - Aufgrund des Token-spezifischen Locks wird nur eine Anfrage erfolgreich sein
    - Alle anderen Anfragen müssen mit 401 fehlschlagen (Token wurde bereits revoked)
    """
    # Arrange: Benutzer registrieren und einloggen
    login_data = auth_utils.register_and_login(
        client, "parallel_refresh@example.com", "SecurePassword123!"
    ).json()
    refresh_token = login_data["refresh_token"]

    # Act: 5 parallele Refresh-Anfragen mit demselben Token
    def refresh_request(_: int) -> dict[str, Any]:
        """Führt eine Refresh-Anfrage aus und gibt Ergebnis zurück."""
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        return {
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "data": response.json() if response.status_code == 200 else None,
        }

    # Parallele Ausführung mit ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(refresh_request, i) for i in range(5)]
        # Warte auf alle Futures in der Reihenfolge ihrer Submission für besseres Debugging
        results = [future.result() for future in futures]

    # Assert: Genau eine Anfrage muss erfolgreich sein, alle anderen müssen fehlschlagen
    successful_results = [r for r in results if r["success"]]
    failed_results = [r for r in results if not r["success"]]

    assert len(successful_results) == 1, (
        f"Erwartet: Genau 1 erfolgreiche Refresh-Anfrage, "
        f"erhalten: {len(successful_results)}"
    )
    assert len(failed_results) == 4, (
        f"Erwartet: Genau 4 fehlgeschlagene Refresh-Anfragen, "
        f"erhalten: {len(failed_results)}"
    )

    # Alle fehlgeschlagenen Anfragen müssen 401 zurückgeben (Token bereits revoked)
    for failed in failed_results:
        assert failed["status_code"] == 401

    # Die erfolgreiche Anfrage muss gültige neue Tokens zurückgeben
    success = successful_results[0]
    assert success["data"] is not None
    assert "access_token" in success["data"]
    assert "refresh_token" in success["data"]
    assert success["data"]["refresh_token"] != refresh_token


def test_parallel_refresh_with_different_tokens_all_succeed(client: TestClient) -> None:
    """
    Parallele Refresh-Anfragen mit unterschiedlichen Tokens: Alle müssen erfolgreich sein.

    Dieser Test validiert, dass der Mutex nur pro Token-Digest wirkt und nicht global:
    - Mehrere Benutzer (oder Sessions) mit unterschiedlichen Tokens
    - Alle sollten parallel erfolgreich refreshen können
    - Keine gegenseitige Blockierung
    """
    # Arrange: 3 verschiedene Benutzer mit je eigenem Token
    users = []
    for i in range(3):
        login_data = auth_utils.register_and_login(
            client, f"user{i}_parallel@example.com", "SecurePassword123!"
        ).json()
        users.append({
            "email": f"user{i}_parallel@example.com",
            "refresh_token": login_data["refresh_token"],
        })

    # Act: Parallele Refresh-Anfragen mit unterschiedlichen Tokens
    def refresh_user_token(user_data: dict[str, str]) -> dict[str, Any]:
        """Führt Refresh für einen bestimmten User-Token aus."""
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": user_data["refresh_token"]},
        )
        return {
            "email": user_data["email"],
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "data": response.json() if response.status_code == 200 else None,
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(refresh_user_token, user) for user in users]
        # Warte auf alle Futures in der Reihenfolge ihrer Submission
        results = [future.result() for future in futures]

    # Assert: Alle Anfragen müssen erfolgreich sein
    successful_results = [r for r in results if r["success"]]
    failed_results = [r for r in results if not r["success"]]

    assert len(successful_results) == 3, (
        f"Erwartet: Alle 3 Refresh-Anfragen erfolgreich, "
        f"erhalten: {len(successful_results)} erfolgreich, {len(failed_results)} fehlgeschlagen"
    )

    # Alle müssen neue, unterschiedliche Tokens erhalten haben
    new_tokens = [r["data"]["refresh_token"] for r in successful_results]
    old_tokens = [u["refresh_token"] for u in users]

    # Neue Tokens müssen sich von alten unterscheiden
    for new_token in new_tokens:
        assert new_token not in old_tokens

    # Alle neuen Tokens müssen unique sein
    assert len(new_tokens) == len(set(new_tokens))


def test_sequential_refresh_after_parallel_attempt(client: TestClient) -> None:
    """
    Sequenzieller Refresh nach parallelem Versuch: Der neue Token muss funktionieren.

    Dieser Test validiert die End-to-End-Funktionalität:
    - Parallele Anfragen mit demselben Token (nur eine erfolgreich)
    - Der neue Token aus der erfolgreichen Anfrage wird für einen weiteren Refresh verwendet
    - Dieser nachfolgende Refresh muss erfolgreich sein
    """
    # Arrange
    login_data = auth_utils.register_and_login(
        client, "sequential_after_parallel@example.com", "SecurePassword123!"
    ).json()
    original_token = login_data["refresh_token"]

    # Act 1: Parallele Refresh-Anfragen
    def refresh_request(_: int) -> dict[str, Any]:
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": original_token},
        )
        return {
            "status_code": response.status_code,
            "data": response.json() if response.status_code == 200 else None,
        }

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(refresh_request, i) for i in range(3)]
        # Warte auf alle Futures in der Reihenfolge ihrer Submission
        results = [future.result() for future in futures]

    # Finde den erfolgreichen Refresh
    successful_results = [r for r in results if r["status_code"] == 200]
    assert len(successful_results) == 1

    new_token = successful_results[0]["data"]["refresh_token"]

    # Act 2: Sequenzieller Refresh mit dem neuen Token
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": new_token},
    )

    # Assert: Der zweite Refresh muss erfolgreich sein
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != new_token
    assert data["refresh_token"] != original_token


def test_parallel_refresh_stress_test(client: TestClient) -> None:
    """
    Stress-Test mit vielen parallelen Refresh-Anfragen (10+).

    Dieser Test validiert die Robustheit des Mutex-Mechanismus unter Last:
    - Viele gleichzeitige Anfragen mit demselben Token
    - Genau eine muss erfolgreich sein
    - Keine Deadlocks oder Timeouts
    """
    # Arrange
    login_data = auth_utils.register_and_login(
        client, "stress_test@example.com", "SecurePassword123!"
    ).json()
    refresh_token = login_data["refresh_token"]

    # Act: 10 parallele Anfragen
    num_requests = 10

    def refresh_request(_: int) -> int:
        """Führt Refresh aus und gibt nur Status-Code zurück."""
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        return response.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(refresh_request, i) for i in range(num_requests)]
        # Warte auf alle Futures in der Reihenfolge ihrer Submission
        status_codes = [future.result() for future in futures]

    # Assert: Genau ein 200, alle anderen 401
    success_count = sum(1 for code in status_codes if code == 200)
    failure_count = sum(1 for code in status_codes if code == 401)

    assert success_count == 1, f"Erwartet: 1 erfolgreicher Refresh, erhalten: {success_count}"
    assert failure_count == num_requests - 1, (
        f"Erwartet: {num_requests - 1} fehlgeschlagene Refreshes, erhalten: {failure_count}"
    )
