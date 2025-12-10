from __future__ import annotations

from typing import Final

from faker import Faker

"""Utility-Funktionen für Test-Passwörter."""

_fake: Final = Faker()

# zentrale Standardlänge für Test-Passwörter
DEFAULT_LEN: Final[int] = 16

# Deterministische Negativbeispiele
# → diese sind bewusst nicht zufällig, um in Tests konsistent zu bleiben
WEAK_PASSWORD: Final[str] = "password"
TOO_SHORT_PASSWORD: Final[str] = "A1!"
NO_DIGIT_PASSWORD: Final[str] = "NoDigits!!AA"
NO_UPPER_PASSWORD: Final[str] = "noupper1!"
NO_LOWER_PASSWORD: Final[str] = "NOLOWER1!"

def _base_password(
    *,
    length: int = DEFAULT_LEN,
    special_chars: bool = True,
    digits: bool = True,
    upper_case: bool = True,
    lower_case: bool = True,
) -> str:
    """Erzeugt ein zufälliges Passwort nach den angegebenen Kriterien."""
    return _fake.password(
        length=length,
        special_chars=special_chars,
        digits=digits,
        upper_case=upper_case,
        lower_case=lower_case,
    )

def valid_password(length: int = DEFAULT_LEN) -> str:
    """Zufälliges, policy‑konformes Passwort für Happy‑Path‑Tests."""
    return _base_password(length=length)

def weak_password() -> str:
    """Bewusst schwaches Passwort für Policy‑/Security‑Tests."""
    return WEAK_PASSWORD

def too_short_password() -> str:
    """Zu kurzes Passwort für Längenvalidierung."""
    return TOO_SHORT_PASSWORD

def password_without_digits(length: int = DEFAULT_LEN) -> str:
    """Passwort ohne Ziffern (für Negativtests)."""
    return _base_password(length=length, digits=False)

def password_without_upper(length: int = DEFAULT_LEN) -> str:
    """Passwort ohne Großbuchstaben."""
    return _base_password(length=length, upper_case=False)

def password_without_lower(length: int = DEFAULT_LEN) -> str:
    """Passwort ohne Kleinbuchstaben."""
    return _base_password(length=length, lower_case=False)