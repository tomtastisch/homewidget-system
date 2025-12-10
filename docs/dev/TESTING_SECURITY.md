### Sicherheits-Testing – Übersicht

Diese Datei dokumentiert die verwendeten Test‑ und Security‑Pakete, neue Test‑Utilities sowie die zusätzlich abgedeckten
kritischen Pfade.

#### Verwendete (Dev‑)Dependencies

- Test‑Runner & Plugins: `pytest`, `pytest-asyncio`, `pytest-cov`, `pytest-timeout`, `pytest-socket`
- Zeit/Determinismus: `freezegun`
- Daten/Property‑Based: `faker`, `hypothesis`
- HTTP‑Testing/Mocking: `httpx`, `respx` (für externe HTTP‑Calls, falls vorhanden)
- Fuzzer/Schema‑Testing: `schemathesis`
- Security/Lint/Dependencies: `ruff` (mit Security‑Regeln `S*` via `[tool.ruff.lint].extend-select = ["S"]`),
  `pip-audit`

Alle Pakete sind als Dev‑Dependencies im Projekt hinterlegt (`backend/pyproject.toml` optional‑extra `dev` bzw.
`backend/requirements.txt`). Es wurden keine bestehenden Versionen verschlechtert.

Zusätzlich ist in `backend/tests/conftest.py` ein optionales Autouse‑Fixture aktiv, das – sofern `pytest-socket`
installiert ist – reale Netzwerkverbindungen blockiert. Der FastAPI‑`TestClient` arbeitet weiterhin in‑process.

#### Neue Test‑Utilities

- `backend/tests/utils/auth.py`
    - `auth_headers(token)`: Bereitet `Authorization`‑Header vor
    - `register(client, email, password)`: Registriert Benutzer
    - `login(client, email, password)`: OAuth2‑Login (Form‑encoded)
    - `register_and_login(client, email, password)`: Helper für Happy‑Path
    - `refresh_tokens(client, refresh_token)`: Token‑Rotation
    - `get_me(client, access_token)`: Aufruf des geschützten Endpunkts
    - `logout(client, access_token)`: Abmelden/Blacklist des Access‑Tokens

Die bestehenden Utilities werden weiterhin genutzt:

- `backend/tests/utils/passwords.py` (Passwort‑Generierung)
- `backend/tests/utils/emails.py` (E‑Mail‑Generierung)

#### Redundanz reduziert

- Tests in `backend/tests/auth/sec/test_auth.py` und `backend/tests/auth/sec/test_token_blacklist.py` verwenden die
  neuen Utilities statt wiederholter Inline‑Logik (Registrieren, Login, Header‑Aufbau).

#### Neue/erweiterte Sicherheits‑Tests

- Auth‑Flows:
    - `/api/auth/refresh`: Rotation, Reuse‑Detection (401), abgelaufene Refresh‑Tokens (mit `freezegun`)
    - `/api/auth/logout`: Blacklisting des präsentierten Access‑Tokens (inkl. Fail‑Open‑Verhalten bei Cache‑Ausfall)
    - `/api/auth/me`: Zugriff mit gültigem/abgelaufenem/ungültigem Token
- Token‑Eigenschaften (Property‑Based mit `hypothesis`):
    - Ablehnung beliebiger Nicht‑JWT‑Strings
    - Ablehnung leicht mutierter Tokens (Zeichen‑Flip)
    - Ablehnung von Tokens mit umgebendem Whitespace
    - Rollen‑Reflexion beim Login für `demo`/`common`/`premium`
- Widgets/Resources (Mandantentrennung):
    - `backend/tests/widgets/test_widgets_security.py`
        - Auth‑Pflicht für `GET /api/widgets/`, `POST /api/widgets/`, `DELETE /api/widgets/{id}`
        - Sichtbarkeit ist auf den Besitzer begrenzt (List‑Scope)
        - Löschen nur durch den Owner; fremde Nutzer erhalten 404

#### Mapping: Muss‑Kriterien → Tests

- Auth‑Flow: Registrierung
    - Gültiger User wird angelegt → `tests/auth/test_register.py::test_register_happy_path` ✓
    - Passwort wird gehasht (kein Klartext in der DB) → implizit über fehlendes `password`/`password_hash` in Response
      geprüft in `test_register_happy_path`; DB‑Persistenz wird in `tests/db/test_persistence.py` abgedeckt. ✓
    - Response enthält keine sensitiven Felder → `test_register_happy_path`, `test_signup_endpoint_works` ✓
- Auth‑Flow: Login
    - Korrekte Credentials liefern Access- und Refresh‑Token mit gültiger Struktur →
      `tests/auth/test_login.py::test_login_returns_token_pair` ✓
    - Falsches Passwort / unbekannter User abgelehnt → `test_login_rejects_wrong_password`,
      `test_login_rejects_unknown_user` ✓
- `/auth/me`
    - Ohne Token → 401 → `tests/auth/sec/test_auth.py::test_me_endpoint_without_token` ✓
    - Mit gültigem Token → 200 und korrekter User‑Kontext → `test_me_endpoint_with_valid_token` ✓
- Token- / Refresh‑Logik
    - Happy Path Refresh → `tests/auth/sec/test_auth.py::test_refresh_token_flow` ✓
    - Einmaligkeit: Reuse abgelehnt → `test_refresh_token_reuse_denied` ✓
    - Ablaufzeiten (freezegun):
        - Abgelaufenes Refresh‑Token → `test_refresh_with_expired_token_returns_401` ✓
        - Abgelaufenes Access‑Token (z. B. bei /auth/me) → `test_me_with_expired_access_token_returns_401` ✓
- Rollen / Authorization
    - Rollenreflexion beim Login (demo/common/premium) →
      `tests/auth/sec/test_token_properties.py::test_roles_reflected_on_login` ✓
    - Premium‑Only Endpoint: aktuell kein dedizierter Premium‑Endpoint vorhanden. Sobald einer existiert, sind Tests in
      `tests/auth/sec/` zu ergänzen (demo ablehnen, premium akzeptieren). ◻︎
- Widgets / Domäne
    - Zugriff erfordert Authentifizierung → `tests/widgets/test_widgets_security.py::test_widgets_requires_auth` ✓
    - Sichtbarkeit nach Ownership/Rollen → `test_create_and_list_widgets_are_scoped_to_user` (Ownership) ✓
- Fehlerbilder / Sicherheit
    - Ungültige Eingaben bei `/auth/register` → `tests/auth/test_register.py::test_register_rejects_empty_input`,
      `test_register_missing_single_field`, `test_register_invalid_email` ✓
    - Fehlerantworten leaken keine sensiblen Details → Verifiziert durch generische 401/4xx und fehlende sensitiven
      Felder; Token‑Property‑Tests lehnen manipulierte/Whitespace‑Tokens ab: `tests/auth/sec/test_token_properties.py` ✓

Hinweis zu `httpx`/`respx`: Aktuell gibt es keine externen HTTP‑Aufrufe im Backend‑Code. Sobald externe Integrationen
hinzukommen, sind Mocks via `respx` vorbereitet, ohne echte Netzverbindungen (durch `pytest-socket`) zu verwenden.

#### Ausführung

- Nur Auth/Security‑relevante Tests:
    - Alle Auth/Security: `pytest backend/tests/auth -v`
    - Token/Blacklist Fokus: `pytest backend/tests/auth/sec -v`
    - Widgets Security: `pytest backend/tests/widgets -v`
- Gesamte Test‑Suite mit Coverage:
    - `pytest backend/tests -q --cov=backend/app --cov-report=term-missing`
- CI: Siehe `docs/ci-cd.md` (Caching, Python‑Version), `backend/pytest.ini` (Marker `unit`/`integration`).
