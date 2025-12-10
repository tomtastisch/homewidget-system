"""Re-Exports für zentrale Security-Dependencies.

Diese Datei bleibt als Import-Kompatibilität bestehen und führt nur noch
Re-Exports der zentralisierten Security-Funktionen aus `app.core.security` aus.
"""
from __future__ import annotations

from ..core.security import get_current_user, oauth2_scheme  # noqa: F401
