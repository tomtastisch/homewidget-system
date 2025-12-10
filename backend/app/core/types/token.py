from __future__ import annotations

from typing import Literal

"""Zentrale Definition der Token-Typen für Auth/JWT."""

# Diese sind lediglich Protokollkonstanten und keine
# Secrets, weshalb die zentrale Definition hier erfolgt.
# → Nicht Sicherheitskritisch
ACCESS = "access"  # noqa: S105
REFRESH = "refresh"  # noqa: S105
BEARER = "bearer"  # noqa: S105

TokenType = Literal["access", "refresh"]
