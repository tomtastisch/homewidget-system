# 🏗️ Systemarchitektur – Homewidget System

Schichten, Module, und Datenfluss des Homewidget Systems (PoC).

---

## 📋 Überblick

Das **Homewidget System** ist ein Widget-Management-System mit JWT-Auth, Rollen-basierter Zugriffskontrolle und
FastAPI-Backend + React Native (Expo)-Frontend.

**Quelle**: `backend/app/main.py:L1-L30`, `mobile/package.json:L1-L30`

---

## 🏛️ Schichten-Architektur

```
┌──────────────────────────────────────────────────────┐
│           Frontend (React Native / Expo)              │
│         (Screens, API-Client, Auth-Context)          │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼─────────────────────────────────┐
│              FastAPI Router & Middleware              │
│           (routes/, auth, CORS, logging)             │
└────────────────────┬─────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
┌────▼──────────────┐   ┌────────────▼─────────────┐
│  Domain/Services  │   │  Infrastructure/Core     │
│  (Auth, Widgets,  │   │  (DB, Cache, Security,   │
│   Feeds)          │   │   Logging)               │
└────┬──────────────┘   └────────────┬─────────────┘
     │                               │
     └───────────────┬───────────────┘
                     │
        ┌────────────▼──────────────┐
        │  Persistence Layer        │
        │  (SQLite/PostgreSQL,      │
        │   Redis/In-Memory Cache)  │
        └───────────────────────────┘
```

**Quelle**: `backend/app/main.py`, `backend/app/api/routes/`, `backend/app/core/`

---

## 📦 Backend-Modul-Struktur (`backend/app/`)

| Modul                   | Zweck                                                    | Quelle                 |
|-------------------------|----------------------------------------------------------|------------------------|
| `main.py`               | FastAPI-Instanz, Lifespan (DB Init, Cache Init, Seed)    | L1-L126                |
| `core/config.py`        | Settings aus Env-Variablen (DB, JWT, Ports, Cache)       | L1-L76                 |
| `core/security.py`      | JWT, Passwort-Hashing, Token-Blacklist, get_current_user | L1-L162                |
| `core/database.py`      | SQLModel-Session, DB-Init, Migrationen                   | (ref. pyproject.toml)  |
| `api/routes/auth.py`    | POST /login, /register, /logout, /refresh                | (ref. ci.yml)          |
| `api/routes/home.py`    | GET /home (Widget-Feed, rollenbasiert gefiltert)         | (ref. ci.yml)          |
| `api/routes/widgets.py` | GET /widgets (Admin), POST /widgets (Admin)              | (ref. ci.yml)          |
| `models/user.py`        | User-Entität: id, email, password_hash, role, tokens     | L1-L60                 |
| `models/widget.py`      | Widget-Entität: id, type, config, visibility_rules, ...  | (ref. ARCHITECTURE.md) |

**Quelle**: `backend/app/` (Verzeichnis-Struktur)

---

## 🔄 Datenfluss

### 1. Login-Flow

```
[Client] POST /api/auth/login (email, password)
  ↓
[Backend: routes/auth.py]
  ├─ Validiere E-Mail-Format (Pydantic)
  ├─ Finde User in DB
  ├─ Verifiziere Passwort (Argon2id)
  ├─ Generiere Access-Token (JWT, ~30 Min)
  ├─ Generiere Refresh-Token (opaque, ~14 Tage, in DB)
  ↓
[Response] { access_token, refresh_token, user }
  ↓
[Client] Speichere Tokens in SecureStore
```

**Quelle**: `backend/app/core/security.py:L54-L95`, `backend/app/models/user.py:L13-L18`

### 2. Home-Feed abrufen

```
[Client] GET /api/home (Header: Authorization: Bearer <access_token>)
  ↓
[Backend: middleware/auth.py → get_current_user()]
  ├─ Extrahiere & dekodiere Token
  ├─ Prüfe Ablauf (exp), Typ (access), Blacklist (jti)
  ├─ Lade User aus DB
  ↓
[Backend: routes/home.py]
  ├─ Query Widgets
  ├─ Filtere nach visibility_rules ∩ user.role
  ├─ Sortiere nach priority (DESC)
  ├─ Cache Response (~5 Min)
  ↓
[Response] [ WidgetRead, ... ]
  ↓
[Client] Rendere Widgets nach Type (Card/Banner/Hero)
```

**Quelle**: `backend/app/core/security.py:L125-L162`, `tools/dev/pipeline/ci_steps.sh:L51-L73`

### 3. Logout & Token-Revokation

```
[Client] POST /api/auth/logout (Header: Authorization: Bearer <access_token>)
  ↓
[Backend: routes/auth.py]
  ├─ Extrahiere jti (JWT ID) aus Token
  ├─ Schreibe (jti, TTL) in Token-Blacklist-Cache
  ├─ (Optional) Invalidiere Refresh-Token in DB
  ↓
[Response] 204 No Content
  ↓
[Client] Lösche Tokens lokal
```

**Quelle**: `backend/app/services/token/blacklist.py` (ref. core/AUTHENTICATION.md)

---

## 🔐 Authentifizierung & Autorisierung

### Rollen-Modell

- **demo**: Unauthentifiziert, schreibgeschützt
- **common**: Registriert, voller Zugriff
- **premium**: Erweiterte Features (future)

**Quelle**: `backend/app/models/user.py:L13-L18`

### JWT-Tokens

| Token       | Typ         | TTL      | Übertragung                     |
|-------------|-------------|----------|---------------------------------|
| **Access**  | JWT (HS256) | ~30 Min  | `Authorization: Bearer <token>` |
| **Refresh** | Opaque + DB | ~14 Tage | Response Body / Client Storage  |

**Quelle**: `backend/app/core/security.py:L54-L95`

### Token-Blacklist

- **Mechanismus**: Cache (In-Memory Dev, Redis Prod)
- **Zweck**: Tokens revozieren (Logout)
- **TTL**: Token-Restlaufzeit

**Quelle**: `backend/app/services/token/blacklist.py`, `backend/app/main.py:L30-L35`

---

## 📊 Tech-Stack

| Schicht                | Technologie         | Version        | Quelle                      |
|------------------------|---------------------|----------------|-----------------------------|
| **Backend-Framework**  | FastAPI             | ≥0.124         | backend/pyproject.toml:L7   |
| **ORM/Validation**     | SQLModel            | ≥0.0.27        | backend/pyproject.toml:L8   |
| **ASGI-Server**        | Uvicorn             | ≥0.38          | backend/pyproject.toml:L9   |
| **Passwort-Hash**      | Argon2-CFfi         | ≥23.1          | backend/pyproject.toml:L10  |
| **JWT**                | python-jose         | ≥3.5.0         | backend/pyproject.toml:L11  |
| **Cache**              | fastapi-cache2      | ≥0.2           | backend/pyproject.toml:L12  |
| **Frontend-Framework** | React Native + Expo | 0.81.5 / ~54.0 | mobile/package.json:L32-L33 |
| **Frontend-Language**  | TypeScript          | ^5.9.3         | mobile/package.json:L43     |
| **E2E-Testing**        | Playwright          | 1.57.0         | mobile/package.json:L36     |

**Quelle**: `backend/pyproject.toml`, `mobile/package.json`

---

## 🚀 Deployment-Profile

### Development (`ENV=dev`)

- Backend: `uvicorn app.main:app --reload` (Port 8000)
- Frontend: `expo start --web` (Port 19006)
- Database: SQLite lokal (`homewidget.db`)
- Cache: In-Memory
- Secrets: Hardcoded Defaults (dev-secret-change-me)

### Testing (`ENV=test`)

- Backend: uvicorn (Port 8100)
- Database: SQLite `/tmp/` (readonly-sicher)
- E2E-Seeds: Idempotentes Seeding (demo/common/premium User + Widgets)

**Quelle**: `backend/app/core/config.py:L14-L54`, `backend/app/main.py:L40-L60`

### Production (`ENV=prod`)

- Backend: Gunicorn + Uvicorn Workers
- Database: PostgreSQL
- Cache: Redis
- Secrets: Env-Variablen (nicht hardcoded)
- Frontend: Expo Web-Build + CDN

---

## 📚 Verwandter Dokumentation

Für Details siehe:

- **Konzepte** (Auth, Widgets, Freemium, Cache): [`TECHNICAL_CONCEPT.md`](TECHNICAL_CONCEPT.md)
- **Setup & Run**: [`SETUP_AND_RUN.md`](SETUP_AND_RUN.md)
- **Tests & CI**: [`CI_TESTING.md`](CI_TESTING.md)
- **Sicherheit**: [`SECURITY.md`](SECURITY.md)
- **Probleme**: [`TROUBLESHOOTING.md`](development/TROUBLESHOOTING.md)

---

*Zuletzt aktualisiert: Dezember 2025*

