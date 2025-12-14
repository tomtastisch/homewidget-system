"""
TCP-Portmanagement: Freie Ports ermitteln, Wartelogik.
"""
from __future__ import annotations

import socket
import time
from typing import Iterable


def find_free_port(host: str) -> int:
    """
    Ermittelt einen freien TCP-Port auf dem gegebenen Host.

    Args:
        host: Hostname oder IP-Adresse (z.B. "127.0.0.1")

    Returns:
        Freier Port-Nummer

    Raises:
        RuntimeError: Wenn kein freier Port gefunden werden kann
    """
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            return sock.getsockname()[1]
    except OSError as exc:
        raise RuntimeError(
            f"Konnte keinen freien Port auf Host '{host}' finden: {exc}"
        ) from exc


def pick_port(host: str, preferred_port: int | str | None) -> int:
    """
    Wählt einen Port aus.

    Priority:
      1. preferred_port (wenn gültig)
      2. Automatisch freier Port (find_free_port)

    Args:
        host: Hostname/IP für Autoermittlung
        preferred_port: Bevorzugter Port (int oder int-string) oder None

    Returns:
        Port-Nummer
    """
    if preferred_port:
        try:
            return int(preferred_port)
        except (ValueError, TypeError):
            pass

    return find_free_port(host)


def iter_sleep(retries: int, delay: float) -> Iterable[int]:
    """
    Generator für Wiederholungs-Schleifen mit Verzögerung.

    Yields:
        Versuchsnummer (1, 2, 3, ...)

    Example:
        for attempt in iter_sleep(retries=30, delay=0.5):
            try:
                # Versuche etwas
                break
            except Exception:
                # Nächster Versuch nach 0.5s
                continue
    """
    for attempt in range(1, retries + 1):
        yield attempt
        if attempt < retries:
            time.sleep(delay)


def wait_for_port(
        host: str,
        port: int,
        retries: int = 30,
        delay: float = 0.5,
        timeout: float = 0.2,
) -> bool:
    """
    Wartet darauf, dass ein TCP-Socket erreichbar ist.

    Args:
        host: Hostname/IP
        port: Port-Nummer
        retries: Anzahl Versuche
        delay: Verzögerung zwischen Versuchen (Sekunden)
        timeout: Socket-Timeout (Sekunden)

    Returns:
        True wenn erreichbar, False bei Timeout
    """
    for _ in iter_sleep(retries=retries, delay=delay):
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            continue

    return False
