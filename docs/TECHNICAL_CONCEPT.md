# 🧠 Technische Konzepte – Homewidget System

Zentrale Fachkonzepte und deren technische Umsetzung.

---

## 1. Authentifizierung & Autorisierung

### Rollen-Modell

Das System hat **drei Rollen** mit unterschiedlichen Feature-Zugriffen:

| Rolle       | Beschreibung                        | Use-Case                    |
|-------------|-------------------------------------|-----------------------------|
| **demo**    | Unauthentifiziert, schreibgeschützt | Einstieg ohne Registrierung |
| **common**  | Standard-Nutzer, voller Zugriff     | Registrierte Nutzer         |
| **premium** | Erweiterte Features (TBD)           | Zahlende Kunden (future)    |

**Quelle**: `backend/app/models/user.py:L13-L18`

### JWT-Token-System

**Access-Token** (kurzlebig, ~30 Min):

- Typ: JWT (signiert mit `HS256`)
- Übertragung: `Authorization: Bearer <token>`
- Validierung: Signatur, Ablauf, Blacklist-Prüfung
- Wird bei jedem Request benötigt

**Refresh-Token** (langlebig, ~14 Tage):

- Typ: Opaque Token (nicht JWT, verhindert Tampering)
- Speicherung: Datenbank-Tabelle `refresh_tokens`
- Hash: HMAC-SHA256 (Klartext wird nicht gespeichert)
- Verwendung: Nur für Token-Refresh

**Quelle**: `backend/app/core/security.py:L54-L95`, `backend/app/models/user.py:L50-L56`

### Token-Blacklist

**Zweck**: Tokens vor natürlichem Ablauf revozieren (Logout).

**Implementierung**:

- Cache-Backend (In-Memory für Dev, Redis-ready für Prod)
- Namespace: `token_blacklist:{jti}` (JTI = JWT ID)
- TTL: Token-Restlaufzeit (exp - now)
- Wert: Marker (z. B. `"1"`)

**Fail-Open**: Wenn Cache nicht verfügbar, Token wird als **nicht blacklisted** behandelt (höchste Verfügbarkeit).

**Quelle**: `backend/app/core/security.py:L135-L155`, `backend/app/services/token/blacklist.py` (Logik)

### Passwort-Sicherheit

- **Hashing**: Argon2id via `argon2-cffi`
- **Validierung**: E-Mail-Format (Pydantic `EmailStr`), Mindestlänge ≥ 8 Zeichen
- **Speicherung**: Nur Hash in DB, Klartext nie

**Quelle**: `backend/app/core/security.py:L32-L49`, `backend/app/models/user.py:L25-L35`

---

## 2. Widget-System (Konzept)

### Widget-Entität

Widgets sind konfigurierbare Inhaltsblöcke mit:

| Feld               | Typ     | Beschreibung                                      |
|--------------------|---------|---------------------------------------------------|
| `id`               | UUID    | Eindeutige ID                                     |
| `product_key`      | str     | Eindeutiger Kennung (z. B. `"deals_banner_001"`)  |
| `type`             | Literal | Widget-Typ: `card`, `banner`, `hero`, ...         |
| `title`            | str     | Anzeigetitel                                      |
| `description`      | str     | Kurzbeschreibung                                  |
| `config_json`      | str     | Type-spezifisches JSON (z. B. Farben, Links)      |
| `visibility_rules` | str     | JSON: Rollen-Filter (`["common", "premium"]`)     |
| `priority`         | int     | Sortierer (höher = früher in Feed)                |
| `slot`             | str     | Platzierung (z. B. `"home_top"`, `"home_bottom"`) |
| `enabled`          | bool    | Aktiv/Inaktiv                                     |

**Quelle**: `backend/app/models/widget.py:L20-L50` (erwartet; siehe ARCHITECTURE.md)

### Home-Feed-Logik

**Ablauf**:

1. Nutzer fordert `GET /api/home` an (mit Authorization-Header)
2. Backend prüft User-Rolle
3. Filtert Widgets: `visibility_rules` muss User-Rolle enthalten
4. Sortiert nach `priority` (DESC)
5. Cacht Ergebnis (~5 Min, TTL konfigurierbar)
6. Gibt `[ WidgetRead, ... ]` zurück

**Quelle**: `backend/app/api/routes/home.py` (erwartet; siehe ARCHITECTURE.md)

---

## 3. Freemium-Modell (Konzept)

### Rollen-Zugriff auf Features

**Strategie**: Widgets haben `visibility_rules`, Backend filtert nach User-Rolle.

| Feature         | demo | common | premium |
|-----------------|------|--------|---------|
| View Home Feed  | ✅    | ✅      | ✅       |
| Login/Register  | ❌    | ✅      | ✅       |
| Edit Profile    | ❌    | ✅      | ✅       |
| Premium Widgets | ❌    | ❌      | ✅       |

**Implementierung**: Widget-Feld `visibility_rules` = JSON-Liste von Rollen.

**Quelle**: `docs/core/FREEMIUM.md` (TBD; siehe core/README.md)

---

## 4. Datenmodell (Schema)

### Users

```python
class User(SQLModel, table=True):
    id: UUID
    email: str(unique, indexed)
    password_hash: str
    role: Literal["demo", "common", "premium"]
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

**Quelle**: `backend/app/models/user.py:L13-L56`

### RefreshTokens

```python
class RefreshToken(SQLModel, table=True):
    id: UUID
    user_id: UUID(FK -> users.id)
    token_hash: str(HMAC - SHA256)
    expires_at: datetime
    created_at: datetime
```

**Quelle**: `backend/app/models/widget.py` (RefreshToken; erwartet)

### Widgets

```python
class Widget(SQLModel, table=True):
    id: UUID
    product_key: str(unique)
    version: int
    type: Literal["card", "banner", "hero", ...]
    title: str
    description: str
    image_url: str
    config_json: str(JSON)
    visibility_rules: str(JSON: ["common", "premium"])
    priority: int
    slot: str
    freshness_ttl: int(Sekunden, Cache - TTL)
    enabled: bool
    created_at: datetime
    updated_at: datetime
```

**Quelle**: ARCHITECTURE.md:L112-L135

---

## 5. Konfigurationsmanagement

### Environment-Variablen

Das System nutzt **Env-Variablen für konfiguriertes Verhalten**:

| Variable                      | Default                   | Beschreibung                   |
|-------------------------------|---------------------------|--------------------------------|
| `ENV`                         | auto (dev/test)           | Umgebung: dev, test, prod      |
| `HW_PROFILE`                  | dev                       | Timing-Profil: dev, e2e, prod  |
| `SECRET_KEY`                  | dev-secret-change-me      | JWT-Signatur-Schlüssel         |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30                        | Access-Token Gültigkeitsdauer  |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | 14                        | Refresh-Token Gültigkeitsdauer |
| `DATABASE_URL`                | sqlite:///./homewidget.db | DB-Connection-String           |
| `CORS_ORIGINS`                | *                         | Komma-getrennte CORS-Ursprünge |
| `LOGIN_RATE_LIMIT`            | 5/60                      | Rate-Limit: Versuche/Sekunden  |

**Quelle**: `backend/app/core/config.py:L10-L60`

### Fail-Safe-Defaults

- **Dev**: SQLite lokal (`homewidget.db`)
- **Test/CI**: SQLite in `/tmp/` (readonly-Probleme vermeiden)
- **Prod**: Muss `DATABASE_URL` explizit setzen

**Quelle**: `backend/app/core/config.py:L40-L54`

---

## 6. Caching-Strategie

### HTTP-Cache (API-Level)

Responsive endliche Daten (z. B. Home-Feed) werden gecacht:

```
GET /api/home
  ↓
Cache-Lookup (FastAPI-Cache)
  ├─ Hit → return cached response
  └─ Miss → fetch from DB, cache, return
```

**TTL**: Widget-spezifisch via `freshness_ttl` (~5 Min default)

**Quelle**: `backend/app/api/routes/home.py` (erwartet)

### Cache-Backend

- **Dev/Test**: In-Memory (`fastapi_cache.backends.inmemory.InMemoryBackend`)
- **Prod**: Redis-ready (konfigurierbar via `fastapi-cache2`)

**Quelle**: `backend/app/main.py:L30-L35`

---

## 7. Observability & Logging

### Strukturiertes Logging

Backend nutzt `loguru` für strukturierte Logs (Kontext-Variablen, Levels):

```python
LOG.info("event_name", extra={"user_id": "...", "duration_ms": 42})
```

**Log-Events**:

- `login_successful`, `login_failed`, `logout_completed`
- `token_blacklist_created`, `token_blacklist_hit`
- `home_feed_fetched`, `cache_hit`, `cache_miss`

**Keine sensitiven Daten** in Logs (Passwörter, Tokens, PII).

**Quelle**: `backend/app/core/logging_config.py` (erwartet)

---

*Zuletzt aktualisiert: Dezember 2025*

