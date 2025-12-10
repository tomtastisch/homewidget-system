"""Utility-Funktionen für Test-E-Mail-Adressen."""
from __future__ import annotations

from typing import Final
from faker import Faker


_fake: Final = Faker()
DEFAULT_DOMAIN: Final = "example.com"


def random_email() -> str:
    """Beliebige synthetische E-Mail-Adresse für Tests."""
    return _fake.email()


def email_for_user(index: int = 1, domain: str = DEFAULT_DOMAIN) -> str:
    """Deterministische, gut lesbare Test-Adresse wie user1@example.com."""
    return f"user{index}@{domain}"


def invalid_email_missing_at() -> str:
    """Typisch ungültige Adresse (kein @)."""
    return "invalid-email.at.example.com"


def invalid_email_missing_domain() -> str:
    """Typisch ungültige Adresse (kein Domain-Teil)."""
    return "user@"