# 👨‍💻 Code-Guidelines – Homewidget System

Dieses Dokument ist die **Single Source of Truth** für Code-Standards, Architektur-Vorgaben und Best Practices im
Homewidget System.

Diese Guidelines gelten für **alle Komponenten** (Backend, Frontend, Tests, Tools).

---

## 1. 🎯 Allgemeine Ziele

- ✅ **Produktiv nutzbarer Code**: Kein Demo-/Script-Stil, sondern produktionsreife Implementierung
- ✅ **Klare Struktur**: Kleine, fokussierte Funktionen/Klassen; kein "God Objects"
- ✅ **Realistische Berechnungen**: Physikalisch/algorithmisch korrekt (keine Magic Numbers)
- ✅ **Erweiterbarkeit**: Komposition vor Vererbung, geringe Kopplung
- ✅ **Stabilität**: Öffentliche APIs langfristig kompatibel
- ✅ **Testbarkeit**: Kernlogik frameworkfrei, Unit-Tests ohne Tricks möglich

---

## 2. 🏛️ Architektur & Struktur

### Clean Architecture: Schichten

```
┌─────────────────────────────────────┐
│     Presentation / API Routes       │  HTTP-Endpunkte, Request-/Response-Handling
├─────────────────────────────────────┤
│   Application / Services Layer      │  Orchestrierung, Use-Cases
├─────────────────────────────────────┤
│     Domain / Business Logic         │  Reine Geschäftslogik, Domänenentitäten
├─────────────────────────────────────┤
│     Infrastructure / Persistence    │  DB, Cache, File Storage, Networking
└─────────────────────────────────────┘
```

**Abhängigkeitsfluss**: ↓ (nur nach unten), nicht nach oben!

### Module & Verantwortlichkeiten

- **Domain** (`domain/users/`, `domain/widgets/`, etc.):
    - Models (Entitäten)
    - Schemas (Pydantic/TypeScript Validierung)
    - Service (Business-Logik, CRUD, Kalkulationen)
    - **Keine I/O, keine API-Routes hier!**

- **API** (`api/`):
    - Route-Handler
    - Request-Validierung delegieren an Domain-Schemas
    - Response-Mapping
    - **Keine Geschäftslogik hier!**

- **Infrastructure** (`core/`, `middleware/`):
    - Datenbankzugriff
    - Cache, Logging
    - JWT, Token-Management
    - **Low-level Operationen**

### Komposition vor Vererbung

```python
# ❌ Vermeiden
class Widget(BaseModel):
    pass

class PromotionalWidget(Widget):
    banner_color: str

# ✅ Bevorzugen
class WidgetConfig:
    pass

class PromotionalWidgetConfig(WidgetConfig):
    banner_color: str

class Widget:
    config: WidgetConfig  # Komposition statt Vererbung
```

---

## 3. 📝 Sprache, Stil & Konventionen

### Sprache: Deutsch (Inland)

- ✅ Variablen, Funktionen, Klassen: Deutsch oder präzise englische Fachbegriffe
- ✅ Docstrings: Deutsch
- ✅ Kommentare: Deutsch
- ✅ Ausgaben (Logs, User-Messages): Deutsch
- ❌ Ausnahmen: Standardisierte Konstanten (RFC, HTTP-Codes, Protokoll-Namen)

### Python: PEP-8 Konform

```python
# ✅ Funktionen/Variablen: snake_case
def get_user_by_email(email: str) -> User | None:
    pass

user_count = 42

# ✅ Klassen: CapWords
class UserService:
    pass

# ✅ Konstanten: UPPER_SNAKE_CASE
MAX_LOGIN_ATTEMPTS = 5
DEFAULT_TOKEN_TTL = 900

# ✅ 4 Leerzeichen, keine Tabs
def beispiel():
    if True:
        print("OK")
```

### TypeScript: Conventions

```typescript
// ✅ Funktionen/Variablen: camelCase
function getUserByEmail(email: string): Promise<User | null> {
  // ...
}

// ✅ Typen/Interfaces: PascalCase
interface UserRead {
  id: string;
  email: string;
}

// ✅ Enums: PascalCase mit UPPER_SNAKE_CASE values
enum UserRole {
  DEMO = "demo",
  COMMON = "common",
  PREMIUM = "premium",
}

// ✅ Konstanten: UPPER_SNAKE_CASE
const MAX_WIDGETS_PER_PAGE = 20;
```

---

## 4. 🔍 Typisierung

### Python: Type Hints (Mandatory)

```python
from __future__ import annotations  # ← Immer oben!
from typing import Optional, Literal, Protocol, TypeAlias

# ✅ Vollständig typisiert
def create_user(
    email: str,
    password: str,
    role: Literal["demo", "common", "premium"] = "common",
) -> User:
    pass

# ✅ Optional bei Rückgabewert
def find_user_by_email(email: str) -> User | None:
    pass

# ✅ Listen, Dicts
def get_widgets_by_role(role: str) -> list[Widget]:
    pass

def get_user_config() -> dict[str, Any]:
    pass

# ❌ Vermeiden: Untypisiert
def process_data(x):  # ← NO!
    pass

# ❌ Vermeiden: Any ohne Grund
def convert_to_json(obj: Any) -> str:  # ← Besser spezifizieren
    pass
```

### TypeScript: Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}

// ✅ Vollständig typisiert
interface UserRequest {
  email: string;
  password: string;
}

async function createUser(req: UserRequest): Promise<UserResponse> {
  // ...
}

// ❌ Vermeiden
function createUser(req: any): any {  // ← NO!
  // ...
}
```

---

## 5. 📖 Dokumentation & Kommentare

### Docstrings (Python)

Jede **öffentliche Klasse, Funktion und Modul** muss einen Docstring haben:

```python
"""
Modul-Docstring (Datei-Header):
Kurze Beschreibung, was dieser Modul tut.
"""

def calculate_discount(
    price: float,
    role: str,
    quantity: int,
) -> float:
    """
    Berechnet einen Rabatt basierend auf Nutzer-Rolle und Menge.
    
    Args:
        price: Basis-Preis in EUR
        role: Nutzer-Rolle (demo, common, premium)
        quantity: Anzahl gekaufter Einheiten
    
    Returns:
        float: Rabattierter Preis in EUR
    
    Raises:
        ValueError: Falls price < 0 oder role unbekannt
    """
    if price < 0:
        raise ValueError("Preis darf nicht negativ sein")
    
    # Logik...
    return discounted_price


class UserService:
    """
    Service für User-Management.
    
    Verwaltet Benutzer (CRUD, Authentifizierung, Rollenlogik).
    Thread-sicher via DB-Locks.
    """
    
    def create_user(self, email: str, password: str) -> User:
        """
        Erstellt einen neuen Benutzer.
        
        Args:
            email: E-Mail-Adresse (unique)
            password: Plaintext-Passwort (wird gehashed)
        
        Returns:
            Neu erstellter User (ohne Passwort-Hash)
        
        Raises:
            ValueError: E-Mail bereits registriert oder ungültig
        """
        pass
```

### JSDoc (TypeScript)

```typescript
/**
 * Holt alle Widgets für einen Nutzer.
 * 
 * @param userId - Die User-ID
 * @param limit - Max. Anzahl Widgets (default: 20)
 * @returns Liste von Widgets, sortiert nach Priorität
 * @throws {NotFoundError} Falls User nicht existiert
 */
export async function getWidgetsForUser(
  userId: string,
  limit: number = 20,
): Promise<Widget[]> {
  // ...
}
```

### Kommentare: Nur für nicht offensichtliche Aspekte

```python
# ✅ Erkläre komplexe Numerik/Geometrie
# Berechne Flugzeit: v_f = sqrt(v_i^2 + 2*g*h)
flight_time = math.sqrt(initial_velocity**2 + 2 * GRAVITY * height)

# ✅ Zustandsmaschinen-Übergänge
# Widget wechselt von 'draft' → 'published' nur nach Validierung
if widget.status == WidgetStatus.DRAFT and self._validate_widget(widget):
    widget.status = WidgetStatus.PUBLISHED

# ❌ Erkläre nicht den Code selbst
# Inkrementiere i
i += 1

# ❌ Keine How-To-Anleitungen als Kommentar
# Um einen Token zu refreshen, rufe die API auf:
# POST /api/auth/refresh ...
```

---

## 6. ⚠️ Fehlerbehandlung & Logging

### Spezifische Exceptions

```python
# ✅ Spezifische Exceptions
def authenticate_user(email: str, password: str) -> User:
    user = self._find_user(email)
    if not user:
        raise ValueError(f"Nutzer mit E-Mail '{email}' nicht gefunden")
    
    if not self._verify_password(password, user.password_hash):
        raise ValueError("Passwort falsch")
    
    return user

# ❌ Vermeiden: Generische/stumme Exceptions
try:
    authenticate_user(...)
except Exception:  # ← What?!
    pass
```

### Logging statt Print

```python
import logging

logger = logging.getLogger(__name__)

# ✅ Logging
def process_widget(widget_id: str):
    logger.info(f"Verarbeite Widget {widget_id}")
    try:
        # Logik...
        logger.debug(f"Widget validiert: {widget_id}")
    except ValueError as e:
        logger.error(f"Widget-Validierung fehlgeschlagen: {e}", exc_info=True)
        raise

# ❌ Vermeiden
print("Processing widget...")  # ← NO!
```

### Logging-Level

- **ERROR**: Fehler, die sofortige Aufmerksamkeit brauchen
- **WARNING**: Potenziell problematisch
- **INFO**: Wichtige Statusmeldungen (Login, Widget-erstellt, etc.)
- **DEBUG**: Detaillierte Diagnostic-Info (Variablenwerte, Zwischenergebnisse)

Keine sensiblen Daten (Passwörter, Tokens, PII) loggen!

### Beenden: Nicht sys.exit()

```python
# ❌ Kernlogik ruft sys.exit() auf
def create_user(...):
    if invalid:
        sys.exit(1)  # ← NO! Aufrufer kann sich nicht erholen

# ✅ Exceptions werfen, Aufrufer entscheidet
def create_user(...) -> User:
    if invalid:
        raise ValueError("...")  # ← Aufrufer kann abfangen
    return user

# ✅ CLI-Code darf sys.exit() nutzen
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)  # ← Hier OK
```

---

## 7. 🧪 Testbarkeit

### Kernlogik: Frameworkfrei

```python
# ✅ Testbar ohne FastAPI
class UserService:
    def __init__(self, db_session):  # Injection statt globale Abhängigkeit
        self.db = db_session
    
    def create_user(self, email: str, password: str) -> User:
        # Pure business logic, keine HTTP-Logik hier
        if not self._is_valid_email(email):
            raise ValueError("E-Mail ungültig")
        return User(email=email, password_hash=hash_password(password))

# ❌ Nicht testbar ohne FastAPI
@app.post("/users")
def create_user_endpoint(email: str, password: str):
    # Gemischt: API + Domain
    user = User(email, password)
    db.add(user)
    return JSONResponse(...)
```

### Test-Struktur

```
tests/
├── conftest.py              # Fixtures, Setup
├── unit/
│   ├── test_user_service.py
│   ├── test_widget_service.py
│   └── ...
├── integration/
│   ├── test_api_auth.py
│   ├── test_api_widgets.py
│   └── ...
└── e2e/
    ├── tests/
    │   └── homescreen.spec.ts  (Playwright)
    └── ...
```

### pytest-Stil

```python
import pytest
from domain.users.service import UserService

class TestUserService:
    @pytest.fixture
    def service(self):
        # Setup
        return UserService(db=MockDB())
    
    def test_create_user_success(self, service):
        # Arrange
        email = "test@example.com"
        password = "secure_password"
        
        # Act
        user = service.create_user(email, password)
        
        # Assert
        assert user.email == email
        assert user.is_active
    
    def test_create_user_invalid_email(self, service):
        # Act & Assert
        with pytest.raises(ValueError, match="ungültig"):
            service.create_user("invalid-email", "password")
```

---

## 8. 🔐 Sicherheit & Datenschutz

### Keine Secrets im Code

```python
# ❌ NO!
JWT_SECRET = "super_secret_xyz"
DB_PASSWORD = "mysql_password_123"

# ✅ Environment-Variablen oder Config
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret: str  # Liest aus JWT_SECRET oder .env
    db_password: str
    
    class Config:
        env_file = ".env"
```

### Eingabevalidierung

```python
# ✅ Externe Eingaben validieren, bevor sie in Logik fließen
def update_user(user_id: str, email: str, role: str) -> User:
    # Validierung
    if not isinstance(user_id, str) or not user_id:
        raise ValueError("user_id ungültig")
    if not self._is_valid_email(email):
        raise ValueError("email ungültig")
    if role not in ["demo", "common", "premium"]:
        raise ValueError("role ungültig")
    
    # Dann: Logik mit validierten Daten
    return self._update_in_db(user_id, email, role)
```

### Keine Secrets in Logs

```python
# ❌ NO!
logger.info(f"Login mit Token: {token}")
logger.debug(f"API-Key: {api_key}")

# ✅ Maskieren oder weglassen
logger.info(f"Login erfolgreich für {user.email}")
logger.debug(f"API-Authentifizierung: OK")
```

---

## 9. 📦 Abhängigkeiten

### Minimalistic Dependencies

- **Standardbibliothek bevorzugen**
- **Externe Libraries nur bei klarem Mehrwert**
- **Keine Convenience-Libraries für triviale Sachen**

Beispiele:

- ✅ `numpy` für Vektor-Mathematik
- ✅ `requests` für HTTP-Calls (statt urllib)
- ✅ `pydantic` für Validierung
- ✅ `pytest` für Tests
- ❌ `colorama` für Terminal-Farben (Python hat das built-in)
- ❌ `inflect` für Plural-Bildung (zu trivial)

### Versionierung

```python
# requirements.txt / pyproject.toml
fastapi == 0.104
.1  # Exakte Version für CI
uvicorn[standard] == 0.24
.0
sqlmodel == 0.0
.14

# oder ranges
fastapi >= 0.100
.0, < 0.105
.0  # Kompatible Versionen
```

---

## 10. 🚀 Konfigurierbares Verhalten

Nicht hartcodieren, was konfigurierbar sein sollte:

```python
# ❌ Hartkodiert
def get_home_feed(user_id: str) -> list[Widget]:
    return db.query(Widget).limit(20).all()  # Magic Number!

# ✅ Konfigurierbar
class FeedConfig:
    max_widgets_per_page: int = 20
    cache_ttl_seconds: int = 300

def get_home_feed(user_id: str, config: FeedConfig) -> list[Widget]:
    return db.query(Widget).limit(config.max_widgets_per_page).all()
```

Konfigurationsquellen:

1. Funktionsparameter (direkt)
2. Config-Objekte (strukturiert)
3. Environment-Variablen (Deployment)

---

## 11. 🔄 Versionskontrolle & PRs

### Commits: Logisch, beschreibend

```bash
✅ Good
git commit -m "Feat: Token-Blacklist für Logout implementieren"
git commit -m "Fix: Bug in Widget-Filter-Logik bei empty results"
git commit -m "Docs: ARCHITECTURE.md aktualisiert"
git commit -m "Test: Unit-Tests für UserService hinzugefügt"

❌ Bad
git commit -m "updates"
git commit -m "fix stuff"
git commit -m "WIP"
```

### PRs: Beschreibung & Quality

- Kurze, aussagekräftige **Beschreibung** des Changes
- **Tests**: Neue Tests für neue Features, bestehende Tests müssen passen
- **Docs**: Docstrings, Kommentare aktualisiert
- **Linting**: Kein Style-Fehler (ruff, mypy, prettier)
- **Review-Ready**: Code-Review innerhalb einer Iteration möglich

---

## 12. 🎨 Gestaltungsspielräume

Diese Guidelines sind **nicht dogmatisch**. Innerhalb der Grenzen sind erlaubt:

- **Funktionaler vs. OOP-Stil**: Wähle, was Readability/Testability verbessert
- **Alternative Algorithmen**: Solange API stabil bleibt und Tests passen
- **Design-Patterns**: Wähle, was Sinn macht (nicht "Pattern um Pattern willen")
- **Struktur-Variationen**: Z. B. `services/` vs. Methods auf Model – solange klar & wartbar

**Bedingung**: Neue Stile/Patterns müssen dokumentiert sein, damit Teamkohärenz bleibt.

---

## 📚 Checkliste für Code Reviews

Vor Code-Merge prüfen:

- [ ] Type-Hints vollständig (Python: `mypy`, TS: `strict`)
- [ ] Docstrings auf öffentlichen APIs vorhanden
- [ ] Keine sensiblen Daten (Passwords, Tokens, Keys) hardcoded
- [ ] Keine `print()` statt `logging` in Kernlogik
- [ ] Spezifische Exceptions, kein pauschales `except Exception`
- [ ] Tests vorhanden und grün (Unit, Integration, E2E je nach Change)
- [ ] Keine toter Code / ungenutzten Parameter
- [ ] Kommentare nur für nicht offensichtliche Aspekte
- [ ] PEP-8 (Python) / Prettier (TS) konform
- [ ] Bestehende APIs nicht gebrochen

---

## 📞 Links & Referenzen

- **PEP-8**: https://pep8.org/
- **Google Style Guide**: https://google.github.io/styleguide/pyguide.html
- **Homewidget ARCHITECTURE**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Testing**: [development/TESTING.md](TESTING.md)

---

*Zuletzt aktualisiert: Dezember 2025*

