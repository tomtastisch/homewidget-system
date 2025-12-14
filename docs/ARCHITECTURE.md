# 🏗️ Systemarchitektur – Homewidget System

Dieses Dokument beschreibt die Gesamtarchitektur des Homewidget Systems (PoC): Schichten, Module, Datenfluss und
Designentscheidungen.

---

## 📋 Überblick

Das **Homewidget System** ist ein Proof-of-Concept für ein Widget-Management-System ähnlich CHECK24:

- **Kern**: Widget-Katalog, Home-Feed mit Personalisierung nach Nutzer-Rolle
- **Auth**: E-Mail/Passwort-Login, JWT (Access/Refresh), Token-Blacklist
- **Rollen**: `demo`, `common`, `premium` → unterschiedliche Widget-Sichtbarkeit
- **Cache**: In-Memory (Dev), erweiterbar auf Redis/etc. (Prod)
- **Frontend**: React Native (Expo) + Web-Build
- **Testing**: Unit-, Integration-, E2E-Tests (Playwright)

---

## 🏛️ Architektur-Ebenen

```
┌──────────────────────────────────────────────────────┐
│           Frontend (Expo React Native)                │
│         (Screens, API-Client, Auth-Flow)             │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼─────────────────────────────────┐
│              FastAPI Gateway/Router                   │
│           (routes/, middleware/, CORS)               │
└────────────────────┬─────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────┐  ┌──────▼──────┐  ┌─────▼────┐
│   API   │  │ Middleware  │  │ Security │
│ Routes  │  │ (Auth, CORS)│  │ (JWT/exp)│
└────┬────┘  └──────┬──────┘  └─────┬────┘
     │              │               │
     └──────────────┼───────────────┘
                    │
     ┌──────────────▼──────────────┐
     │   Domain / Business Logic   │
     │ (users, widgets, feeds)     │
     └──────────────┬──────────────┘
                    │
     ┌──────────────▼──────────────────┐
     │  Infrastructure / Persistence   │
     │ (Database, Cache, File Storage) │
     └─────────────────────────────────┘
```

---

## 📦 Modul-Struktur

### Backend (`backend/app/`)

```
app/
├── main.py                         # FastAPI-Instanz, Startup, Routes
├── core/
│   ├── config.py                   # Settings (DB, JWT-Secret, Ports, etc.)
│   ├── db.py                       # SQLModel-Session, Migrationen
│   ├── security.py                 # JWT, Passwort-Hashing, Token-Blacklist
│   └── cache.py                    # Cache-Backend (In-Memory/Redis)
│
├── api/
│   ├── __init__.py
│   ├── auth.py                     # POST /login, /register, /logout, /refresh
│   ├── users.py                    # GET /users/{id}, PATCH /users/{id}
│   ├── widgets.py                  # GET /widgets (Admin), POST /widgets (Admin)
│   ├── home.py                     # GET /home (Widget-Feed für User)
│   └── health.py                   # GET /health
│
├── domain/
│   ├── users/
│   │   ├── models.py               # User-Entität, Rollen
│   │   ├── schemas.py              # Pydantic-Schémas (UserRead, UserCreate, etc.)
│   │   └── service.py              # User-Logik (create, update, getByEmail)
│   │
│   ├── widgets/
│   │   ├── models.py               # Widget-Entität
│   │   ├── schemas.py              # WidgetRead, WidgetCreate, etc.
│   │   └── service.py              # Widget-CRUD, Validierung
│   │
│   └── feeds/
│       ├── models.py               # (optional) Feed-Entität
│       ├── schemas.py              # FeedRead
│       └── service.py              # Home-Feed-Logik (Filter, Sort, Cache)
│
├── middleware/
│   ├── auth.py                     # JWT-Validation, User-Injection
│   ├── cors.py                     # CORS-Handling
│   ├── rate_limit.py               # Rate-Limiting (optional)
│   └── logging.py                  # Request-/Response-Logging
│
├── models/
│   └── (Alias für domain/models)   # Re-Export für einfachere Imports
│
├── schemas/
│   └── (Alias für domain/schemas)  # Re-Export
│
├── services/
│   └── (Alias für domain/service)  # Re-Export
│
└── __init__.py
```

### Frontend (`mobile/src/`)

```
src/
├── App.tsx                         # Root-Component, Navigation
├── api/
│   ├── homeApi.ts                  # GET /home, Widget-Fetch
│   ├── authApi.ts                  # Login, Register, Logout
│   └── client.ts                   # HTTP-Client (Axios/Fetch), Token-Refresh
│
├── auth/
│   ├── context.ts                  # AuthContext (User, Token)
│   └── useAuth.ts                  # Hook für Auth-Status
│
├── screens/
│   ├── LandingScreen.tsx           # Login/Register/Demo
│   ├── HomeScreen.tsx              # Widget-Feed
│   └── SettingsScreen.tsx          # User-Settings (optional)
│
├── components/
│   ├── widgets/
│   │   ├── WidgetCard.tsx          # Card-Layout Widget
│   │   ├── WidgetBanner.tsx        # Banner-Layout Widget
│   │   └── WidgetHero.tsx          # (optional) Hero-Layout
│   │
│   └── (UI-Komponenten)
│
├── types/
│   ├── widgets.ts                  # WidgetType Union, Schemas
│   ├── api.ts                      # API-Response-Types
│   └── user.ts                     # UserRead, UserRole
│
├── storage/
│   ├── secureStore.ts              # expo-secure-store Wrapper
│   └── localStorage.ts             # Non-sensitive storage
│
└── logging/
    └── logger.ts                   # Logging-Utility
```

---

## 🔄 Datenfluss

### 1. **Nutzer-Login**

```
[Frontend: LoginScreen]
  ↓ (POST /api/auth/login)
[Backend: routes/auth.py → AuthService]
  ↓ (Passwort-Validierung, JWT generieren)
[Response: { access_token, refresh_token, user }]
  ↓ (speichern in SecureStore)
[Frontend: AuthContext updated]
```

### 2. **Home-Feed abrufen**

```
[Frontend: HomeScreen]
  ↓ (GET /api/home, mit Authorization-Header)
[Backend: routes/home.py]
  ↓ (JWT validieren + User aus Token)
[Backend: FeedService.get_home_feed(user)]
  ↓ (Widgets filtern nach Rolle, cachen)
[Cache-Lookup/Hit oder DB-Abfrage]
  ↓ (Response: [ WidgetRead, ... ])
[Frontend: Render Widgets nach Type]
```

### 3. **Token-Refresh**

```
[Frontend: Access-Token abgelaufen]
  ↓ (POST /api/auth/refresh mit Refresh-Token)
[Backend: AuthService.refresh_access_token()]
  ↓ (Neuen Access-Token generieren, in Blacklist prüfen)
[Response: { access_token }]
  ↓ (speichern in SecureStore, erneut versuchen)
[Ursprünglicher Request erneut senden]
```

### 4. **Logout**

```
[Frontend: Logout-Button]
  ↓ (POST /api/auth/logout mit Authorization-Header)
[Backend: TokenBlacklist.add(jti)]
  ↓ (TTL = Token-Restlaufzeit)
[Response: OK]
  ↓ (Token lokal löschen)
[Frontend: Redirect zu Landing]
```

---

## 🔐 Sicherheit

### JWT-Aufbau

**Access-Token** (kurz gültig, ~15 Min):

```json
{
  "sub": "user@example.com",
  "type": "access",
  "exp": 1735737600,
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Refresh-Token** (lang gültig, in DB):

```
opaque token stored in refresh_tokens table
(nicht JWT, Schutz vor Token-Tampering)
```

### Token-Blacklist

- **Mechanismus**: In-Memory (Dev) oder Redis-Backend
- **Zweck**: Token revozieren (Logout, vorzeitig)
- **TTL**: Entspricht Token-Restlaufzeit
- **Namespace**: `token_blacklist:{jti}`

### Passwort-Sicherheit

- **Hashing**: Argon2id (via `argon2-cffi`)
- **Validierung**: E-Mail-Format, Mindestlänge (>= 8 Zeichen)

---

## 💾 Datenmodell

### Users

- `id`: UUID
- `email`: str (unique)
- `password_hash`: str
- `role`: Literal["demo", "common", "premium"]
- `is_active`: bool
- `created_at`, `updated_at`: datetime

### Widgets

- `id`: UUID
- `product_key`: str (unique identifier)
- `version`: int
- `type`: Literal["card", "banner", "hero", ...]
- `title`: str
- `description`: str
- `image_url`: str
- `config_json`: str (JSON mit spezifischen Feldern je Typ)
- `visibility_rules`: str (JSON: which roles see this)
- `priority`: int (Sortierung)
- `slot`: str (Desktop/Mobile/etc.)
- `freshness_ttl`: int (Cache-Sekunden)
- `enabled`: bool
- `created_at`, `updated_at`: datetime

### RefreshTokens

- `id`: UUID
- `user_id`: FK(User)
- `token_hash`: str (Hash des opaque Tokens)
- `expires_at`: datetime
- `created_at`: datetime

---

## 🎯 Design-Entscheidungen

| Aspekt              | Entscheidung                        | Grund                                               |
|---------------------|-------------------------------------|-----------------------------------------------------|
| **Framework**       | FastAPI                             | Modern, Type-Safe, schnell, Built-in OpenAPI        |
| **ORM**             | SQLModel                            | Kombination von Pydantic + SQLAlchemy, saubere API  |
| **Auth**            | JWT + Refresh-Token                 | Standard, Skalierbar, Stateless                     |
| **Token-Blacklist** | Cache-Backend (nicht DB)            | Performance, TTL-Handling, einfache Invalidierung   |
| **Cache**           | In-Memory (Dev), Redis-ready (Prod) | Schnell, Skalierbar, Pluggable Backend              |
| **Frontend**        | React Native (Expo)                 | Cross-Platform, Live Reload, Hot Reload, TS-Support |
| **Testing**         | pytest (Backend), Playwright (E2E)  | Robust, Community-Support, Good DevEx               |

---

## 🚀 Deployment

### Development

- **Backend**: `uvicorn app.main:app --reload` (Port 8000)
- **Frontend**: `expo start` (Port 19006)
- **Database**: SQLite (lokal)
- **Cache**: In-Memory

### Production (Konzept)

- **Backend**: Gunicorn + Uvicorn (mehrere Worker)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Frontend**: Expo Web-Build
- **Hosting**: Docker + K8s (oder Cloud-Services)

---

## 📚 Weitere Dokumentation

Für tiefere Details zu spezifischen Aspekten:

- **Authentication**: [`core/AUTHENTICATION.md`](../core/AUTHENTICATION.md)
- **Widget-Domain**: [`core/WIDGETS.md`](../core/WIDGETS.md)
- **Freemium-System**: [`core/FREEMIUM.md`](../core/FREEMIUM.md)
- **Sicherheit**: [`core/SECURITY.md`](../core/SECURITY.md)
- **CI/CD**: [`infrastructure/CI-CD.md`](../infrastructure/CI-CD.md)
- **Testing**: [`development/TESTING.md`](../development/TESTING.md)
- **Code-Guidelines**: [`development/GUIDELINES.md`](../development/GUIDELINES.md)

---

*Zuletzt aktualisiert: Dezember 2025*

