# 🔐 Security – Homewidget System

Sicherheitsarchitektur, Token-Management, Validierung und Best Practices.

---

## 🔑 JWT & Token-System

### Access-Token (JWT, kurzlebig)

**Struktur**:

```json
{
    "sub": "user@example.com",
    // Subject (User-Email)
    "type": "access",
    // Token-Typ
    "exp": 1735737600,
    // Expiry (Unix-Timestamp)
    "jti": "550e8400-e29b-41d4-..."
    // JWT ID (für Blacklist)
}
```

**Eigenschaften**:

- Signatur: HMAC-SHA256 mit `SECRET_KEY`
- TTL: ~30 Minuten (konfigurierbar: `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Übertragung: `Authorization: Bearer <token>` Header
- Validierung: Signatur, Ablauf (exp), Blacklist (jti), Typ ("access")

**Quelle**: `backend/app/core/security.py:L54-L75`, `backend/app/core/config.py:L24`

### Refresh-Token (Opaque, langlebig)

**Struktur**:

- Type: Opaque Token (nicht dekodierbar, verhindert Tampering)
- Speicherung: Datenbank-Tabelle `refresh_tokens` (Hash-basiert)
- TTL: ~14 Tage (konfigurierbar: `REFRESH_TOKEN_EXPIRE_DAYS`)
- Hash: HMAC-SHA256 (nur Hash in DB, Klartext nie)

**Verwendung**: Nur zur Generierung neuer Access-Tokens bei Ablauf.

**Quelle**: `backend/app/core/security.py:L105-L115`, `backend/app/models/user.py:L50-L56`

---

## 🚫 Token-Blacklist (Revokation)

### Mechanismus

**Zweck**: Tokens revozieren vor natürlichem Ablauf (z. B. Logout).

**Implementierung**:

- Cache-Backend: In-Memory (Dev), Redis (Prod)
- Key-Format: `token_blacklist:{jti}`
- Value: Marker (z. B. `"1"`)
- TTL: Token-Restlaufzeit (exp - now)

**Validierungs-Ablauf**:

```
GET /api/home (mit JWT)
  ↓
1. Signatur & Ablauf prüfen
2. Token-Typ validieren ("access")
3. JTI in Blacklist suchen → is_access_token_blacklisted(jti)
4. Wenn gefunden → 401 Unauthorized
5. Sonst → Request erlauben
```

**Fail-Open Verhalten**: Falls Cache nicht verfügbar, Token wird als **nicht blacklisted** behandelt (höchste
Verfügbarkeit in PoC).

**Quelle**: `backend/app/core/security.py:L135-L155`, `backend/app/services/token/blacklist.py` (Logic)

---

## 🔐 Passwort-Sicherheit

### Hashing-Algorithmus

- **Algorithmus**: Argon2id (via `argon2-cffi`)
- **Parameter**: Standardwerte (memory=65536, time=3, parallelism=4)
- **Speicherung**: Nur Hash in Datenbank, Klartext **nie**

**Implementierung**:

```python
from argon2 import PasswordHasher

ph = PasswordHasher()

# Hashing
password_hash = ph.hash("user_password")

# Verifikation
try:
    ph.verify(password_hash, "user_input_password")
    # Match!
except VerifyMismatchError:
# No match
```

**Quelle**: `backend/app/core/security.py:L32-L49`

### Validierung

**Anforderungen**:

- E-Mail-Format: RFC-konform (via Pydantic `EmailStr`)
- Mindestlänge: ≥ 8 Zeichen (Passwort)
- Keine sprachspezifischen Anforderungen (kein Unicode-Whitelist)

**Quelle**: `backend/app/schemas/auth.py` (UserCreate, expected)

---

## 🔒 Secrets-Management

### Geheim-Parameter (nicht hardcoden!)

| Parameter         | Quelle       | Handling                         |
|-------------------|--------------|----------------------------------|
| `SECRET_KEY`      | Env-Variable | Darf nicht im Code sein          |
| `DATABASE_URL`    | Env-Variable | Darf nicht im Code sein          |
| Token-Hashes      | Datenbank    | Nur Hash speichern, nie Klartext |
| API-Keys (future) | Env-Variable | ✅ Immer extern halten            |

**Quelle**: `backend/app/core/config.py:L13-L18`

### Development-Defaults

```python
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
```

**WARNUNG**: "dev-secret-change-me" ist **nicht sicher** für Production. Muss in Prod durch starken Secret ersetzt
werden.

**Quelle**: `backend/app/core/config.py:L15`

---

## ✅ Eingabevalidierung

### Backend-Validierung (Pydantic)

Alle API-Eingaben werden durch **Pydantic-Schemas** validiert:

```python
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr  # RFC-konform
    password: str = Field(min_length=8)
    role: Literal["demo", "common", "premium"] = "common"
```

**Validierungspunkte**:

- Email-Format (RFC)
- Passwort-Länge (≥ 8)
- Enum-Werte (nur gültige Rollen)
- JSON-Schema-Compliance (type checking)

**Quelle**: `backend/app/schemas/auth.py` (expected)

### Frontend-Validierung (TypeScript)

Frontend validiert **vor** Request-Senden:

- Email-Format (regex oder HTML5 input type)
- Passwort-Länge
- Required-Fields

**Aber**: Backend ist **Source of Truth**. Frontend-Validierung nur für UX.

**Quelle**: `mobile/src/screens/LoginScreen.tsx` (expected)

---

## 📝 Logging (ohne sensible Daten)

### Struktur & Levels

**Log-Events** (relevant):

- `login_successful`: Nutzer erfolgreich angemeldet
- `login_failed`: Falsches Passwort / nicht registriert
- `logout_completed`: Logout erfolgreich
- `token_blacklist_created`: Token revoziert (JTI geloggt, nicht Token-Wert)
- `home_feed_fetched`: Feed abgerufen (User-ID geloggt, nicht Token)

**Struktur** (mit `loguru`):

```python
LOG.info("login_successful", extra={"user_id": "...", "ip": "..."})
LOG.error("login_failed", extra={"email": "...", "reason": "invalid_password"})
```

### NIEMALS loggen:

- ❌ Passwörter (Klartext oder Hash)
- ❌ Token-Werte (Access/Refresh)
- ❌ Sensible PII (Vollständige E-Mails nur wenn notwendig)
- ❌ Credit-Card-Daten, Secrets

**Quelle**: `backend/app/core/logging_config.py` (expected)

---

## 🛡️ Authentifizierung (Auth-Flow)

### 1. Login (POST /api/auth/login)

```
Input: { email, password }
  ↓
1. Validiere Email-Format (Pydantic)
2. Finde User in DB (Email-Lookup)
3. Verifiziere Passwort (Argon2id.verify)
   → False: 401 Unauthorized (kein Detail, welches Feld falsch)
   → True: Generiere Tokens
4. Generiere Access-Token (JWT)
5. Generiere Refresh-Token (opaque, in DB speichern)
6. Return: { access_token, refresh_token, user }
```

**Quelle**: `backend/app/api/routes/auth.py` (expected), `backend/app/core/security.py:L80-L95`

### 2. Protected Request (GET /api/home)

```
Input: Authorization: Bearer <access_token>
  ↓
1. Extrahiere Token aus Header
2. Dekodiere JWT (signatur-Validierung)
3. Prüfe Ablauf (exp claim)
4. Prüfe Token-Typ (type == "access")
5. Prüfe Blacklist (is_access_token_blacklisted(jti))
6. Lade User aus DB (by email in "sub")
7. Prüfe is_active flag
8. Injiziere User in Request-Context
9. Handler-Ausführung mit User
```

**Quelle**: `backend/app/core/security.py:L125-L162`

### 3. Logout (POST /api/auth/logout)

```
Input: Authorization: Bearer <access_token>
  ↓
1. Validiere Token (wie Protected Request)
2. Extrahiere JTI + Ablauf (exp)
3. Berechne TTL (exp - now)
4. Schreibe in Blacklist (key=jti, ttl=TTL)
5. (Optional) Invalidiere Refresh-Token in DB
6. Return: 204 No Content
```

**Quelle**: `backend/app/api/routes/auth.py` (expected), `backend/app/services/token/blacklist.py`

---

## 🌐 CORS & Cross-Origin

### CORS-Konfiguration

```python
CORSMiddleware(
    allow_origins=settings.CORS_ORIGINS,  # Default: "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Config** (Env-Variable):

```bash
# Development (alles erlaubt)
CORS_ORIGINS="*"

# Production (nur trusted origins)
CORS_ORIGINS="https://example.com,https://app.example.com"
```

**Quelle**: `backend/app/main.py:L83-L89`, `backend/app/core/config.py:L59-L68`

---

## 🔄 Rate-Limiting

### Login-Rate-Limit

- **Limit**: 5 Versuche pro 60 Sekunden (konfigurierbar: `LOGIN_RATE_LIMIT`)
- **Trigger**: Über FastAPI-Limiter (IP-basiert)
- **Response**: 429 Too Many Requests

**Quelle**: `backend/app/core/config.py:L54`, `backend/app/api/routes/auth.py` (expected)

### Feed-Rate-Limit

- **Limit**: 60 Anfragen pro 60 Sekunden (konfigurierbar: `FEED_RATE_LIMIT`)
- **Trigger**: Pro User (Token-basiert)

**Quelle**: `backend/app/core/config.py:L55`

---

## 🔗 Transport-Security (HTTPS in Prod)

### Development

- HTTP (lokal, keine Sekunden-Daten)
- Backend: `http://127.0.0.1:8000`
- Frontend: `http://localhost:19006`

### Production (erwartet)

- **HTTPS** (TLS 1.2+)
- **HSTS** Header setzen
- **Secure Cookies** (falls verwendet)
- **CSP** Header (Content-Security-Policy)

**Hinweis**: Nicht im aktuellen PoC implementiert. Für Production erforderlich.

---

## 🧪 Security-Tests (E2E)

### Auth-Resilience-Tests

```typescript
// @standard AUTH-04: Falsches Passwort → Fehler
test('AUTH-04: Login mit falschem Passwort', async ({page}) => {
	// ... Registriere Nutzer
	// ... Versuche Login mit falschem Passwort
	// ... Verifiziere Fehler
	// ... Verifiziere, dass kein Token im Storage
});

// @standard AUTH-06: Abgelaufener Refresh-Token → Re-Login
test('AUTH-06: Abgelaufener Refresh-Token', async ({page}) => {
	// ... Login erfolgreich
	// ... Setze abgelaufenen Token
	// ... Reload triggert Token-Refresh-Versuch
	// ... Verifiziere Re-Login
});
```

**Quelle**: `tests/e2e/browseri/playwright/specs/auth.resilience.spec.ts:L1-L173`

---

## 📚 Verwandte Dokumentation

- **Token-Details**: [`TECHNICAL_CONCEPT.md`](TECHNICAL_CONCEPT.md) (Section 1)
- **Troubleshooting**: [`TROUBLESHOOTING.md`](development/TROUBLESHOOTING.md)
- **Architektur**: [`ARCHITECTURE.md`](ARCHITECTURE.md) (Section: Authentifizierung & Autorisierung)

---

*Zuletzt aktualisiert: Dezember 2025*

