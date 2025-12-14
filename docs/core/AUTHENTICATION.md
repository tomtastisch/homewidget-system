# 🔐 Authentication – Homewidget System

Dieses Dokument beschreibt das Authentifizierungs- und Authorization-System des Homewidget Systems.

---

## 📋 Überblick

Das **Authentication-System** basiert auf:

- **OAuth2 PasswordBearer**: Standard HTTP-Bearer Token (JWT)
- **JWT mit Access/Refresh Tokens**:
    - Access-Token: Kurzlebig (~15 Min), wird mit jedem Request gesendet
    - Refresh-Token: Langlebig, wird nur für Token-Refresh gesendet
- **Token-Blacklist**: Für Token-Revokation (Logout)
- **Passwort-Sicherheit**: Argon2id-Hashing

---

## 🔑 JWT-Aufbau

### Access-Token (JWT)

Gültig für ~15 Minuten. Wird mit jedem Request im `Authorization: Bearer <token>` Header gesendet.

**Payload-Beispiel:**

```json
{
  "sub": "user@example.com",
  "type": "access",
  "exp": 1735737600,
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Claims:**

- `sub` (Subject): E-Mail des Nutzers
- `type`: "access" (zur Unterscheidung von Refresh-Tokens)
- `exp` (Expiry): Unix-Timestamp der Gültigkeitsdauer
- `jti` (JWT ID): Eindeutige Token-ID für Blacklist-Revokation (UUID4)

**Generierung:** `backend/app/services/security.py` → `create_access_token()`

### Refresh-Token (Opaque)

Gültig für ~7 Tage. Wird nur beim Token-Refresh gesendet.

**Speicherung**: Database-Tabelle `refresh_tokens` (kein JWT, um Token-Tampering zu vermeiden)

**Struktur in DB:**

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR NOT NULL,        -- Hash des opaque Tokens
    expires_at TIMESTAMP NOT NULL,      -- Gültigkeitsdauer
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Generierung:** `backend/app/services/security.py` → `create_refresh_token()`

---

## 🔄 Authentication-Fluss

### 1. Login

```
[Client] POST /api/auth/login
  ├─ Body: { "email": "user@example.com", "password": "..." }
  ↓
[Backend: routes/auth.py]
  ├─ Validiere E-Mail-Format
  ├─ Finde User in DB
  ├─ Verifiziere Passwort (Argon2id)
  ├─ Generiere Access-Token (JWT)
  ├─ Generiere Refresh-Token (Opaque) + speichere in DB
  ↓
[Response] 200 OK
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "opaque_token_hex_string",
    "token_type": "bearer",
    "expires_in": 900,  // Sekunden
    "user": { "id": "...", "email": "...", "role": "common" }
  }
```

### 2. Authentifizierte Request

```
[Client] GET /api/home
  ├─ Header: Authorization: Bearer <access_token>
  ↓
[Backend: middleware/auth.py → dependency get_current_user()]
  ├─ Extrahiere Token aus Header
  ├─ Dekodiere JWT-Signatur
  ├─ Prüfe Ablauf (exp)
  ├─ Verifiziere Token-Typ ("access")
  ├─ Prüfe Token-Blacklist (jti)
  ├─ Lade User aus DB
  ↓
[Business Logic] kann User nutzen
  ├─ Filtere Widgets nach User-Rolle
  ├─ Lese/Schreibe mit User-Kontext
  ↓
[Response] 200 OK + Widget-Daten
```

### 3. Token-Refresh

```
[Client] Token abgelaufen (exp erreicht)
  ↓
[Client] POST /api/auth/refresh
  ├─ Body: { "refresh_token": "<refresh_token>" }
  ↓
[Backend: routes/auth.py → AuthService.refresh_access_token()]
  ├─ Finde Refresh-Token-Hash in DB
  ├─ Verifiziere Gültigkeitsdauer
  ├─ Verifiziere Zugehörigen User
  ├─ Generiere neuen Access-Token
  ├─ (Optional) Generiere neuen Refresh-Token (Token-Rotation)
  ↓
[Response] 200 OK
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "new_opaque_token_hex_string",  // Neu
    "token_type": "bearer",
    "expires_in": 900
  }
```

### 4. Logout (Token-Revokation)

```
[Client] POST /api/auth/logout
  ├─ Header: Authorization: Bearer <access_token>
  ↓
[Backend: routes/auth.py → TokenBlacklistService]
  ├─ Extrahiere Token-Payload (jti, exp)
  ├─ Berechne TTL: exp - now (Restlaufzeit)
  ├─ Schreibe (jti, TTL) in Token-Blacklist-Cache
  ├─ (Optional) Invalidiere Refresh-Token in DB
  ↓
[Response] 204 No Content
  (Token ist nun revoziert)
  ↓
[Client] Lösche Tokens lokal (SecureStore)
```

---

## 🚫 Token-Blacklist (Revokation)

### Mechanismus

**Ziel:** Tokens vor natürlichem Ablauf revozieren (z. B. bei Logout).

**Implementierung:**

- **Backend**: Cache-System (In-Memory in Dev, Redis-ready für Prod)
- **Namespace**: `token_blacklist:{jti}`
- **TTL**: Entspricht Token-Restlaufzeit (exp - now)
- **Wert**: Kleiner Marker (z. B. `b"1"`)

**Validierungsfluss:**

1. JWT-Signatur & Expiry prüfen
2. Token-Typ validieren ("access")
3. **Blacklist abfragen:** `is_access_token_blacklisted(jti)`
4. Wenn gefunden → 401 Unauthorized

### Fail-Open Verhalten

Falls die Cache-Backend **nicht verfügbar** ist:

- System loggt Warnung
- Token wird als **nicht blacklisted** behandelt
- API bleibt verfügbar (Best Effort)
- **Grund**: Access-Tokens sind kurzlebig; Refresh-Tokens sind DB-backed und bleiben gültig

Dies ist bewusst designed für **höchste Verfügbarkeit** im PoC.

### Logging

Diese Events werden geloggt (ohne sensible Daten):

- `token_blacklist_created`: JTI blacklisted, TTL Sekunden
- `token_blacklist_hit`: Präsentierter Token in Blacklist gefunden
- `blacklist_set_failed` / `blacklist_get_failed`: Cache-Backend nicht verfügbar
- `logout_completed`: Logout-Request erfolgreich

---

## 🔐 Passwort-Sicherheit

### Hashing-Algorithmus: Argon2id

```python
from argon2 import PasswordHasher

hasher = PasswordHasher()

# Hashing
password_hash = hasher.hash("user_password_plaintext")

# Verifikation
try:
    hasher.verify(password_hash, "user_input_password")
    # OK
except VerifyMismatchError:
    # Passwort falsch
    pass
```

**Argon2id vorteile:**

- Modern, gegen Timing-Attacken resistent
- Speicher- + Zeit-intensive Hash-Funktion
- Standard in Python Community

### Validierung

**E-Mail:**

- Format: `user@example.com` (RFC-5322-ähnlich)
- Case-insensitive für Lookups

**Passwort:**

- Mindestlänge: 8 Zeichen
- Keine spezifischen Komplexitäts-Anforderungen (UX > Security-Theater)
- Servierweise: Plaintext übertragen via HTTPS, Hash in DB gespeichert

---

## 👥 Rollen & Authorization

### Rollen-Modell

```python
class UserRole(str, Enum):
    DEMO = "demo"          # Demo-Nutzer (ohne Login, eingeschränkte Widgets)
    COMMON = "common"      # Registrierter Nutzer
    PREMIUM = "premium"    # Premium-Abonnent
```

### Authorization-Logik

**Im Domain-Layer** (nicht in API-Routes):

```python
def get_home_widgets(user: User) -> list[Widget]:
    """Widgets für Home-Feed, gefiltert nach Nutzer-Rolle."""
    
    # Logik: Hole nur Widgets sichtbar für die User-Rolle
    return db.query(Widget).filter(
        Widget.visibility_rules.contains(user.role)
    ).all()
```

### Role-Based Access Control (RBAC)

**Beispiel:** Nur Admins dürfen Widgets erstellen

```python
@app.post("/api/widgets")
async def create_widget(
    widget: WidgetCreate,
    current_user: User = Depends(get_current_user),  # Dependency
) -> WidgetRead:
    """Erstellt ein neues Widget (nur Admins)."""
    
    # Guard: Prüfe Role
    if current_user.role not in ["admin"]:  # Later: könnte auch RBAC-Policy sein
        raise HTTPException(status_code=403, detail="Nicht berechtigt")
    
    return await WidgetService.create(widget)
```

---

## 🛠️ Implementierungs-Details

### Modul-Struktur

```
backend/app/
├── services/
│   ├── security.py              # JWT, Passwort-Hashing, Token-Generierung
│   ├── token_blacklist.py       # Blacklist-Cache-Logik
│   └── auth.py                  # AuthService (Login, Register, Refresh)
│
├── api/
│   └── auth.py                  # Routes: /login, /register, /logout, /refresh
│
├── middleware/
│   └── auth.py                  # JWT-Dependency, get_current_user()
│
├── models/
│   └── users.py                 # User-Entity (SQLModel)
│
└── core/
    └── security.py              # Config: JWT_SECRET, ALGORITHM, etc.
```

### Key Functions

```python
# security.py
def create_access_token(email: str, ttl_seconds: int = 900) -> str:
    """Generiert einen JWT Access-Token."""

def create_refresh_token() -> str:
    """Generiert einen opaquen Refresh-Token (hex-encoded UUID)."""

def hash_password(plaintext: str) -> str:
    """Hasht ein Passwort mit Argon2id."""

def verify_password(plaintext: str, hash: str) -> bool:
    """Verifiziert ein Passwort gegen seinen Hash."""

def decode_access_token(token: str) -> dict:
    """Dekodiert JWT, prüft Signatur und exp."""

# token_blacklist.py
async def blacklist_access_token(jti: str, expires_at: datetime) -> None:
    """Invalidiert einen Access-Token."""

async def is_access_token_blacklisted(jti: str) -> bool:
    """Prüft, ob ein Token blacklisted ist."""

# auth.py (service)
async def authenticate_user(email: str, password: str) -> User:
    """Authentifiziert einen Nutzer, gibt User zurück."""

async def register_user(email: str, password: str) -> User:
    """Registriert einen neuen Nutzer."""

async def refresh_access_token(refresh_token: str) -> dict:
    """Refreshed den Access-Token."""
```

---

## 🌐 API-Endpunkte

### POST /api/auth/login

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "role": "common",
    "is_active": true
  }
}
```

**Error (401):**

```json
{
  "detail": "E-Mail oder Passwort falsch"
}
```

---

### POST /api/auth/register

**Request:**

```json
{
  "email": "new_user@example.com",
  "password": "secure_password"
}
```

**Response (201):**

```json
{
  "id": "...",
  "email": "new_user@example.com",
  "role": "common",
  "is_active": true
}
```

**Error (400):**

```json
{
  "detail": "E-Mail bereits registriert"
}
```

---

### POST /api/auth/refresh

**Request:**

```json
{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Error (401):**

```json
{
  "detail": "Invalid refresh token"
}
```

---

### POST /api/auth/logout

**Request (mit Authorization Header):**

```
Authorization: Bearer <access_token>
```

**Response (204):**

```
(Kein Body)
```

Dieser Endpoint revoziert den präsentierten Access-Token durch Blacklist-Eintrag.

---

## 🧪 Testing

### Test-Strategie

```python
# tests/auth/test_auth_flow.py

def test_login_success():
    """Login mit korrekten Credentials."""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_email():
    """Login mit nicht-existierender E-Mail."""
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "password123"
    })
    assert response.status_code == 401

def test_logout_revokes_token():
    """Logout blacklisted den Access-Token."""
    # Login
    login_response = client.post("/api/auth/login", ...)
    token = login_response.json()["access_token"]
    
    # Logout
    logout_response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logout_response.status_code == 204
    
    # Token sollte nun invalid sein
    home_response = client.get(
        "/api/home",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert home_response.status_code == 401

def test_token_refresh():
    """Refresh-Token erzeugt neuen Access-Token."""
    # ...
```

---

## 📊 Sequenzdiagramm

```
┌─────────────┐                  ┌─────────────┐                  ┌────────┐
│   Client    │                  │   Backend   │                  │   DB   │
└──────┬──────┘                  └──────┬──────┘                  └───┬────┘
       │                                │                             │
       │─── POST /api/auth/login ──────>│                             │
       │   (email, password)            │                             │
       │                                │─── SELECT * FROM users ──> │
       │                                │<────────── User ───────────│
       │                                │                             │
       │                                │ [Passwort verifizieren]    │
       │                                │                             │
       │                                │─── INSERT INTO ────────────>
       │                                │     refresh_tokens         │
       │<─── { access_token, ... } ────│                             │
       │                                │                             │
       │─── GET /api/home ────────────>│                             │
       │    (Authorization: Bearer ...) │                             │
       │                                │ [JWT verifizieren]         │
       │                                │ [Blacklist prüfen]         │
       │                                │─── SELECT * FROM widgets ─>│
       │<─────── [ Widgets ] ───────────│<────────── Widgets ────────│
       │                                │                             │
       │─── POST /api/auth/logout ────>│                             │
       │    (Authorization: Bearer ...) │                             │
       │                                │ [Token blacklisten]        │
       │<─────── 204 No Content ───────│                             │
       │                                │                             │
```

---

## ⚠️ Bekannte Limitationen (PoC)

1. **Token-Blacklist nicht persistent**: In-Memory Backend, Restart löscht Einträge
2. **Kein Multi-Tenancy**: System kennt nur einen JWT_SECRET
3. **Keine 2FA**: E-Mail/Passwort nur
4. **Kein Account-Lockout**: Keine Schutzmaßnahmen gegen Brute-Force
5. **Refresh-Token Rotation**: Optional, nicht standardmäßig

Zukünftige Tickets können diese Aspekte adressieren.

---

## 📚 Siehe auch

- [ARCHITECTURE.md](../ARCHITECTURE.md) – Systemüberblick
- [core/SECURITY.md](SECURITY.md) – Security-Policies
- [development/TESTING.md](../development/TESTING.md) – Testing-Strategie
- [development/GUIDELINES.md](../development/GUIDELINES.md) – Code-Standards

---

*Zuletzt aktualisiert: Dezember 2025*

