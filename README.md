Home‑Widget‑System — Clean Architecture

Überblick
Das Projekt besteht aus zwei Hauptteilen:
- backend: FastAPI/SQLModel‑basierter Service mit JWT‑Auth (OAuth2PasswordBearer), Argon2id‑Hashing, Caching (fastapi‑cache2) und In‑Memory‑Rate‑Limiting.
- mobile: Expo React‑Native (TypeScript) App mit Secure Store zur Speicherung von Access‑ und Refresh‑Tokens und Navigation (Login/Home).

Architektur
Sechs Schichten mit klaren Verantwortlichkeiten:
1) Transport
   - FastAPI HTTP‑API mit Routen für Authentifizierung, Widgets und Home‑Feed.
   - Endpunkte liegen unter backend/app/api/routes (auth.py, widgets.py, home.py).
   - Kommunikation über HTTPS/JSON. CORS für Mobile‑App aktiviert.
   - Mobile‑Client ruft die API über einen zentralen API‑Client auf und setzt den Authorization‑Header.

2) Security
   - Authentifizierungsfluss: OAuth2 Password Flow (OAuth2PasswordBearer) für Login.
   - Tokens: JWT (HS256) als Access‑Token; Refresh‑Tokens werden serverseitig persistent gespeichert und können widerrufen werden.
   - Passwörter: Hashing mit Argon2id (passlib CryptContext). Verifikation beim Login.
   - Token‑Erzeugung/Verifikation: siehe backend/app/services/security.py (create_jwt/decode_jwt).
   - Rate‑Limiting: in‑memory pro Endpunkt (z. B. Login/Feed) konfiguriert; schützt vor Brute‑Force und Abuse.
   - Caching: fastapi‑cache2 (InMemoryBackend) für stark frequentierte Lese‑Endpunkte (z. B. Home‑Feed), um Latenzen zu reduzieren.

3) Domain
   - Reine Geschäftslogik in Services, ohne Framework‑Kopplung:
     - AuthService: Signup, Login (Authenticate), Token‑Ausstellung/Rotation.
     - HomeFeedService: Aggregation der Widgets für den Home‑Feed eines Users.
     - WidgetSelectionService: Auswahl/Filterung/Sortierung von Widgets.
   - Services werden über FastAPI‑Dependencies injiziert und sprechen mit der Persistence‑Schicht.

4) Persistence
   - ORM: SQLModel/SQLAlchemy mit Entities User, Widget, RefreshToken.
   - Default‑Datenbank: SQLite (Datei homewidget.db). Konfigurierbar via env `DATABASE_URL`.
   - Sessions werden pro Request geöffnet. Migrationsstrategie: kann via Alembic ergänzt werden (derzeit nicht zwingend erforderlich für das Demo‑Setup).

5) Infrastructure
   - Settings: zentrale Konfiguration in backend/app/core/config.py (SECRET_KEY, Token‑Laufzeiten, Rate‑Limits, DATABASE_URL, ENV).
   - App‑Bootstrap: backend/app/main.py registriert Routen, setzt CORS, konfiguriert Cache/Rate‑Limiter.
   - Logging: standardmäßiges FastAPI/uvicorn‑Logging; erweiterbar.
   - Cache/Rate‑Limit Backends: aktuell In‑Memory; produktiv austauschbar (Redis empfohlen).

6) Client
   - Expo/React‑Native (TypeScript) App mit Navigation (Login, Home) und zentralem API‑Client.
   - Token‑Handling mit expo‑secure‑store (Access/Refresh getrennt).
   - Der API‑Client setzt automatisch den Authorization‑Header und triggert bei 401 den Refresh‑Flow.

Domain‑Modell
- User (backend/app/models/user.py)
  - Attribute: id, email (unique), password_hash, is_active, created_at
  - Beziehungen: 1‑n zu Widget (User.widgets)

- Widget (backend/app/models/widget.py)
  - Attribute: id, name, config_json, owner_id, created_at
  - Beziehungen: n‑1 zu User (Widget.owner)

- RefreshToken (backend/app/models/widget.py)
  - Attribute: id, user_id, token (unique), expires_at, created_at, revoked
  - Beziehungen: n‑1 zu User
  - Zweck: Serverseitige, widerrufbare Refresh‑Tokens; Access‑Tokens bleiben stateless JWTs.

Request‑Flow
1) Registrierung (Signup)
   - Client → POST /auth/signup mit email, password.
   - Backend: prüft E‑Mail‑Uniqueness, hasht Passwort via Argon2id und legt User an.
   - Antwort: 201/200 ohne Token oder direktes Token‑Pair (je nach Implementierung). In diesem Projekt erfolgt der Login explizit nach Signup.

2) Login (Password Flow)
   - Client → POST /auth/login (OAuth2 Password: username=email, password=...)
   - Backend: verifiziert Passwort, prüft is_active.
   - Token‑Ausstellung: AuthService.issue_tokens erstellt
     - Access‑Token (JWT, HS256, Laufzeit = ACCESS_TOKEN_EXPIRE_MINUTES)
     - Refresh‑Token (zufälliger String, persistent gespeichert, Laufzeit = REFRESH_TOKEN_EXPIRE_DAYS)
   - Antwort‑Payload (Beispiel):
     {
       "access_token": "<jwt>",
       "refresh_token": "<opaque>",
       "expires_in": <sekunden>
     }

3) Token‑Nutzung im Client
   - Speicherung: Access/Refresh werden via expo‑secure‑store abgelegt.
   - Requests: Der API‑Client setzt `Authorization: Bearer <access_token>`.
   - Home‑Feed: GET /home oder /home/feed (siehe routes/home.py). Antworten können gecacht werden.
   - Caching: fastapi‑cache2 reduziert Rechenlast/Latenz für unveränderte Feeds.
   - Rate‑Limiting: pro User/IP begrenzt (z. B. FEED_RATE_LIMIT=60/60)

4) Refresh‑Flow
   - Auslöser: 401/expired Access‑Token oder proaktiver Ablauf.
   - Client → POST /auth/refresh mit Refresh‑Token (z. B. im Body oder Header, je nach Route‑Definition).
   - Backend: findet RefreshToken, prüft Ablauf/Widerruf, markiert altes als revoked, stellt neues Token‑Pair aus (Access+Refresh) und persistiert das neue Refresh‑Token.
   - Client: ersetzt gespeicherte Tokens im Secure Store und wiederholt die ursprüngliche Anfrage.

Mobile‑Spezifika
1) Secure Storage (expo‑secure‑store)
   - Dateien: mobile/src/storage/tokens.ts
   - API:
     - saveTokens(access, refresh)
     - getAccessToken() / getRefreshToken()
     - clearTokens()
   - Empfehlung: Access‑Token im Speicher nur kurz halten; Refresh‑Token strikt geschützt lagern. Bei Logout beide löschen.

2) Token‑Handling im Request‑Flow
   - Beim App‑Start: getAccessToken() lesen; wenn nicht vorhanden/abgelaufen → getRefreshToken() und /auth/refresh.
   - Beim 401 vom Backend: genau einmal Refresh versuchen; bei Fehlschlag Logout erzwingen (clearTokens, Navigation zum Login).
   - Race‑Conditions vermeiden: Refresh‑Anfragen serialisieren; während Refresh keine parallelen API‑Calls ohne gültigen Access‑Token senden.

3) iOS‑Builds mit Expo (EAS)
   - Voraussetzungen: `eas login`, `eas build:configure` (einmalig pro Projekt).
   - Build‑Befehle:
     - Development: `eas build --platform ios --profile development`
     - Preview: `eas build --platform ios --profile preview`
     - Production: `eas build --platform ios --profile production`
   - Workflow (grober Überblick):
     1. Environment‑Variablen/Secrets in EAS konfigurieren (API‑Base‑URL, ggf. Sentry, etc.).
     2. `eas build` ausführen und auf die Cloud‑Artefakte warten.
     3. App auf Gerät/TestFlight installieren und gegen Backend testen.

Backend
Struktur (Auszug)
- backend/app/core: config.py, database.py
- backend/app/models: user.py, widget.py (inkl. RefreshToken)
- backend/app/schemas: Pydantic Schemas für Auth und Widgets
- backend/app/services: AuthService, HomeFeedService, WidgetSelectionService, Security, Rate‑Limiter
- backend/app/api/routes: auth.py, widgets.py, home.py
- backend/app/main.py: FastAPI‑App, Startup‑Hooks, Routen‑Registrierung

Konfiguration & Settings
- SECURITY
  - Algorithmus: HS256 (`ALGORITHM`)
  - Access‑Token‑Laufzeit: `ACCESS_TOKEN_EXPIRE_MINUTES` (Default 30)
  - Refresh‑Token‑Laufzeit: `REFRESH_TOKEN_EXPIRE_DAYS` (Default 14)
- DATABASE
  - `DATABASE_URL` (Default sqlite:///./homewidget.db)
- RATE LIMITS
  - `LOGIN_RATE_LIMIT` (Default 5/60)
  - `FEED_RATE_LIMIT` (Default 60/60)
- ENV
  - `ENV` (dev|prod), `SECRET_KEY`

Hinweise für neue Teammitglieder
- Lies zuerst diesen README‑Abschnitt „Architektur“ und „Domain‑Modell“.
- Starte dann das Backend (uvicorn) und die Mobile‑App (Expo) lokal, prüfe Login/Feed.
- Verfolge den Auth‑Flow im Code: services/security.py → services/auth_service.py → api/routes/auth.py.
- Prüfe, wie Tokens im Client gespeichert/geladen werden: mobile/src/storage/tokens.ts und der zentrale API‑Client.

Devcontainer & Setup
- Der Devcontainer (VS Code/JetBrains Gateway) ist in `.devcontainer/devcontainer.json` definiert. Er enthält Python 3.13 und Node 18.
- Beim Öffnen im Devcontainer wird automatisch das Setup‑Skript ausgeführt:
  - `postCreateCommand: bash -lc 'bash tools/dev/setup_dev_env.sh'`
- Manuelle Ausführung lokal/außerhalb des Devcontainers:
  - `bash tools/dev/setup_dev_env.sh`
  - Wirkung:
    - Backend: erzeugt/aktualisiert `backend/.venv` und installiert Dependencies (editable `-e .[dev]`).
    - Mobile: führt in `mobile/` ein `npm install` aus.
  - Das Skript ist idempotent und kann gefahrlos mehrfach ausgeführt werden.