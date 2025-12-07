Home‑Widget‑System — Clean Architecture

Überblick
Das Projekt besteht aus zwei Hauptteilen:
- backend: FastAPI/SQLModel‑basierter Service mit JWT‑Auth (OAuth2PasswordBearer), Argon2id‑Hashing, Caching (fastapi‑cache2) und In‑Memory‑Rate‑Limiting.
- mobile: Expo React‑Native (TypeScript) App mit Secure Store zur Speicherung von Access‑ und Refresh‑Tokens und einfacher Navigation.

Clean‑Architecture‑Sichten
- Transport: FastAPI HTTP‑API (Auth, Widgets, Home‑Feed) + CORS für Mobile. React‑Native App kommuniziert per HTTPS mit dem Backend.
- Security: OAuth2 Password Flow, JWT (HS256) für Access‑Tokens, serverseitig gespeicherte Refresh‑Tokens (revokabel). Passwörter via Argon2id gehasht. Rate‑Limiting für Login und Feed.
- Domain: Services kapseln die Geschäftslogik (AuthService, HomeFeedService, WidgetSelectionService). Keine Framework‑Details in den Services.
- Persistence: SQLModel/SQLAlchemy mit Entities User, Widget, RefreshToken. SQLite per Default, konfigurierbar via DATABASE_URL.
- Infrastructure: FastAPI‑App, Dependency‑Injection über FastAPI Depends, Cache via fastapi‑cache2 InMemoryBackend, In‑Memory‑Rate‑Limiter.
- Client: Expo/React‑Native App (TypeScript) mit SecureStore für Token‑Speicherung, Login‑Screen, Home‑Feed‑Screen und Navigation.

Backend
Struktur (Auszug)
- backend/app/core: config.py, database.py
- backend/app/models: user.py, widget.py (inkl. RefreshToken)
- backend/app/schemas: Pydantic Schemas für Auth und Widgets
- backend/app/services: AuthService, HomeFeedService, WidgetSelectionService, Security, Rate‑Limiter
- backend/app/api/routes: auth.py, widgets.py, home.py
- backend/app/main.py: FastAPI‑App, Startup‑Hooks, Routen‑Registrierung

Schnellstart
1) Abhängigkeiten installieren (am besten in einer venv):
   pip install -r backend/requirements.txt
2) Entwicklung starten (Uvicorn):
   uvicorn backend.app.main:app --reload
3) API öffnen: http://localhost:8000/docs

Konfiguration (ENV Variablen)
- SECRET_KEY: JWT‑Secret (Default dev‑secret‑change‑me)
- ACCESS_TOKEN_EXPIRE_MINUTES: Access‑Token‑Lebensdauer (Default 30)
- REFRESH_TOKEN_EXPIRE_DAYS: Refresh‑Token‑Lebensdauer (Default 14)
- DATABASE_URL: z. B. sqlite:///./homewidget.db
- LOGIN_RATE_LIMIT: Format N/W, z. B. 5/60
- FEED_RATE_LIMIT: Format N/W, z. B. 60/60

Wichtige Endpunkte
- POST /api/auth/signup — Registrierung
- POST /api/auth/login — OAuth2 Password (form‑urlencoded: username, password)
- POST /api/auth/refresh — Refresh‑Token rotieren
- GET  /api/auth/me — aktueller User
- GET  /api/widgets/ — eigene Widgets
- POST /api/widgets/ — Widget anlegen
- DELETE /api/widgets/{id} — Widget löschen
- GET  /api/home/feed — Home‑Feed (gecacht, rate‑limited)

Mobile (Expo React‑Native, TypeScript)
Schnellstart
1) Wechsel in das mobile‑Verzeichnis und Abhängigkeiten installieren:
   cd mobile
   npm install
2) Entwicklung starten:
   npm run start
3) In der App die Backend‑URL in mobile/src/api/client.ts ggf. anpassen (BASE_URL).

Token‑Speicherung
- Access‑/Refresh‑Tokens werden sicher in Expo SecureStore gespeichert. Der API‑Client erneuert Access‑Tokens automatisch mittels Refresh‑Token.

Git & Push
- Dateien wurden in das Repository eingecheckt. Um auf GitHub zu pushen:
  git remote add origin https://github.com/<dein-account>/homewidget-system.git
  git branch -M main
  git push -u origin main
