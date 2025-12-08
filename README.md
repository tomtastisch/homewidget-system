Home‑Widget‑System — Clean Architecture

Überblick
Das Projekt besteht aus zwei Hauptteilen:
- backend: FastAPI/SQLModel‑basierter Service mit JWT‑Auth (OAuth2PasswordBearer), Argon2id‑Hashing, Caching (fastapi‑cache2) und In‑Memory‑Rate‑Limiting.
- mobile: Expo React‑Native (TypeScript) App mit Secure Store zur Speicherung von Access‑ und Refresh‑Tokens und Navigation (Login/Home).

Clean‑Architecture‑Sichten
- Transport: FastAPI HTTP‑API (Auth, Widgets, Home‑Feed) + CORS für Mobile. React‑Native App kommuniziert per HTTPS mit dem Backend.
- Security: OAuth2 Password Flow, JWT (HS256) für Access‑Tokens, serverseitig gespeicherte Refresh‑Tokens (revokabel). Passwörter via Argon2id gehasht. Rate‑Limiting für Login und Feed.
- Domain: Services kapseln die Geschäftslogik (AuthService, HomeFeedService, WidgetSelectionService). Keine Framework‑Details in den Services.
- Persistence: SQLModel/SQLAlchemy mit Entities User, Widget, RefreshToken. SQLite per Default, konfigurierbar via DATABASE_URL.
- Infrastructure: FastAPI‑App, Dependency‑Injection über FastAPI Depends, Cache via fastapi‑cache2 InMemoryBackend, In‑Memory‑Rate‑Limiter.
- Client: Expo/React‑Native App (TypeScript) mit SecureStore für Token‑Speicherung, zentralem API‑Client und Navigation.

Backend
Struktur (Auszug)
- backend/app/core: config.py, database.py
- backend/app/models: user.py, widget.py (inkl. RefreshToken)
- backend/app/schemas: Pydantic Schemas für Auth und Widgets
- backend/app/services: AuthService, HomeFeedService, WidgetSelectionService, Security, Rate‑Limiter
- backend/app/api/routes: auth.py, widgets.py, home.py
- backend/app/main.py: FastAPI‑App, Startup‑Hooks, Routen‑Registrierung