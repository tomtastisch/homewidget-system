# 🧪 CI/Testing – Homewidget System

CI-Pipeline, Test-Strategie und lokale Reproduktion.

---

## 📋 CI-Pipeline (GitHub Actions)

### Workflow-Datei & Trigger

- **Pfad**: `.github/workflows/ci.yml`
- **Runner**: Ubuntu Latest (Shared GitHub Runners)
- **Trigger**: Push auf `main`/`master`, alle Pull Requests
- **Dauer**: ~5-10 Minuten (abhängig von Tests)

**Quelle**: `.github/workflows/ci.yml:L1-L40`

---

## 🐍 Backend-Checks (Python)

### Jobs & Steps

| Job                      | Schritte                                  | Befehl                             | Quelle              |
|--------------------------|-------------------------------------------|------------------------------------|---------------------|
| **Setup-Backend**        | venv erstellen, Dependencies installieren | `bash tools/dev/setup_dev_env.sh`  | L41-L42             |
| **Linting (Ruff)**       | Code-Style, Import-Order, Sicherheit      | `ruff check app/`                  | ci_steps.sh:L51-L52 |
| **Type-Checking (MyPy)** | Strikte Type-Analyse                      | `mypy app/`                        | ci_steps.sh:L51-L52 |
| **Unit-Tests**           | pytest -m unit                            | `pytest tests -m 'unit' -v`        | ci_steps.sh:L61-L62 |
| **Integration-Tests**    | pytest -m integration                     | `pytest tests -m 'integration' -v` | ci_steps.sh:L71-L72 |
| **E2E-Contract-Tests**   | System-Tests (Backend + Frontend)         | `pmcd_run run-e2e-contracts`       | ci_steps.sh:L91-L92 |

**Quelle**: `.github/workflows/ci.yml:L88-L159`, `tools/dev/pipeline/ci_steps.sh:L35-L92`

### Configuration

**pyproject.toml** (Backend):

```ini
[tool.mypy]
ignore_missing_imports = true
check_untyped_defs = true  # für core/, models/, services/

[tool.ruff]
line-length = 120
target-version = "py312"
ignore = ["D", "ANN", "B008"]  # D=Docstrings, ANN=Annotations, B008=FastAPI Depends
extend-select = ["S"]  # Security rules
```

**pytest.ini** (Backend):

```ini
[pytest]
filterwarnings =
    ignore:Module already imported so cannot be rewritten.*anyio:pytest.PytestAssertRewriteWarning
```

**Quelle**: `backend/pyproject.toml:L58-L72`, `backend/pytest.ini:L1-L10`

---

## 📱 Mobile-Checks (TypeScript/React Native)

### Jobs & Steps

| Job                  | Schritte                          | Befehl                        | Quelle                          |
|----------------------|-----------------------------------|-------------------------------|---------------------------------|
| **Setup-Mobile**     | npm ci, Dependencies installieren | `npm ci --no-fund --no-audit` | tools/dev/setup_dev_env.sh:L145 |
| **expo-doctor**      | Expo-Konfiguration prüfen         | `expo-doctor`                 | ci_steps.sh (ref.)              |
| **Linting (ESLint)** | Code-Style, Fehler                | `npm run lint`                | mobile/package.json:L14         |
| **TypeScript-Check** | Type-Analyse                      | `tsc --noEmit`                | mobile/package.json:L15         |
| **Jest-Tests**       | Unit/Component Tests              | `npm test`                    | mobile/package.json:L16         |
| **Build**            | Web-Build (Expo)                  | `npm run build`               | mobile/package.json:L11         |

**Quelle**: `.github/workflows/ci.yml:L162-L237`, `tools/dev/pipeline/ci_steps.sh:L200-L250`

### Configuration

**eslint.config.js**:

- Plugin: `typescript-eslint`
- Rules: strict mode, unused variables, import order

**tsconfig.json**:

- `strict: true` (strict nullability, no implicit any)
- Target: `ES2020`

**jest** (in package.json):

```json
{
    "preset": "jest-expo",
    "setupFilesAfterEnv": [
        "@testing-library/react-native/extend-expect",
        "src/test/setup.ts"
    ],
    "forceExit": true
}
```

**Quelle**: `mobile/package.json:L75-L85`, `mobile/eslint.config.js`, `mobile/tsconfig.json`

---

## 🎭 E2E-Tests (Playwright)

### E2E-Gate & Browser-Tests

| Job                 | Zweck                                    | Kommando                                       | Quelle                |
|---------------------|------------------------------------------|------------------------------------------------|-----------------------|
| **E2E-System-Gate** | Health-Check, Demo-Feed, Auth-Spec       | `e2e_gate_checks`, `e2e_playwright_gate_tests` | ci_steps.sh:L158-L200 |
| **E2E-Minimal**     | Kritische User-Flows (Login, Feed)       | `pytest tests/e2e -m e2e_minimal`              | ci_steps.sh:L210-L230 |
| **E2E-Standard**    | Erweiterte Flows (Token-Refresh, Logout) | `pytest tests/e2e -m e2e_standard`             | ci_steps.sh:L230-L250 |

**Quelle**: `.github/workflows/ci.yml:L270-L360`, `tools/dev/pipeline/ci_steps.sh:L155-L250`

### Playwright-Setup

```bash
# System starten (Backend + Expo-Web)
bash tools/dev/pipeline/ci_steps.sh e2e_backend_start      # Port 8100
bash tools/dev/pipeline/ci_steps.sh e2e_expo_web_start     # Port 19006

# Tests ausführen
npx playwright test --config=tests/e2e/browseri/playwright/playwright.config.ts
```

**Test-Specs** (unter `tests/e2e/browseri/playwright/specs/`):

- `auth.spec.ts` – Login, Register, Token-Handling
- `auth.resilience.spec.ts` – Fehlerbehandlung (falsch Passwort, abgelaufene Tokens, Rate-Limit)
- `home.spec.ts` – Widget-Feed, Rollen-Filterung
- `widgets.spec.ts` – CRUD (Create/Read/Update/Delete)

**Quelle**: `tests/e2e/browseri/playwright/` (Struktur), `.github/workflows/ci.yml:L270-L360`

---

## ✅ Quality-Gates

Für erfolgreichen PR müssen bestehen:

### Backend

- ✅ **Ruff**: Keine Style-Fehler (`ruff check app/`)
- ✅ **MyPy**: Keine Type-Fehler (`mypy app/`)
- ✅ **Unit-Tests**: Alle grün (`pytest tests -m unit`)
- ✅ **Integration-Tests**: Alle grün (`pytest tests -m integration`)

### Mobile

- ✅ **Expo-Doctor**: Alle 17 Checks grün
- ✅ **ESLint**: Keine Fehler (`npm run lint`)
- ✅ **TypeScript**: Keine Type-Fehler (`tsc --noEmit`)
- ✅ **Jest**: Alle Tests grün (`npm test`)
- ✅ **Build**: Erfolgreich (`npm run build`)

### E2E

- ✅ **System-Gate**: Health-Check + Demo-Feed OK
- ✅ **Playwright-Minimal**: Kritische Auth-Flows OK
- ✅ **Playwright-Standard**: Erweiterte User-Flows OK

**Quelle**: `.github/workflows/ci.yml:L340-L365` (finish job summary)

---

## 🖥️ Lokale Reproduktion

### Backend-Setup

```bash
bash tools/dev/setup_dev_env.sh
```

Dies:

- Erzeugt `backend/.venv` mit Python 3.13+
- Installiert Dependencies: FastAPI, SQLModel, pytest, ruff, mypy, etc.
- Verifiziert Imports (FastAPI, SQLModel, Pydantic)

**Quelle**: `tools/dev/setup_dev_env.sh:L20-L91`

### Backend-Checks lokal

```bash
cd backend

# Linting
ruff check app/

# Type-Checking
mypy app/

# Unit-Tests
pytest tests -m unit -v

# Integration-Tests
pytest tests -m integration -v
```

**Quelle**: `.github/workflows/ci.yml:L133-L159`

### Mobile-Setup

```bash
cd mobile
npm install  # oder npm ci (CI-Mode)
```

### Mobile-Checks lokal

```bash
cd mobile

# Linting
npm run lint

# TypeScript-Check
npm run type-check  # oder npx tsc --noEmit

# Jest-Tests
npm test

# Build
npm run build
```

**Quelle**: `.github/workflows/ci.yml:L180-L237`, `mobile/package.json:L6-L20`

---

## 🚀 E2E-Tests lokal (Playwright)

### Setup & Start

```bash
# Backend im E2E-Modus (Port 8100)
bash tools/dev/pipeline/ci_steps.sh e2e_backend_start

# Expo-Web im E2E-Modus (Port 19006)
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8100
export HW_PROFILE=e2e
bash tools/dev/pipeline/ci_steps.sh e2e_expo_web_start
```

### Tests ausführen

```bash
cd tests/e2e/browseri/playwright

# Alle Tests (headed Mode für Debugging)
npx playwright test --ui

# Nur bestimmte Spec
npx playwright test specs/auth.spec.ts

# Nur bestimmte Tags (@standard, @extended)
npx playwright test -g @standard
```

**Quelle**: `tests/e2e/browseri/playwright/playwright.config.ts`, `tests/e2e/browseri/playwright/specs/`

---

## 📊 Test-Struktur & Markers

### Backend (pytest)

```python
# Unit-Tests
@pytest.mark.unit
def test_password_hashing():
    ...


# Integration-Tests
@pytest.mark.integration
def test_login_flow():
    ...


# E2E-Contract-Tests
@pytest.mark.contract
def test_home_feed_endpoint():
    ...
```

**Quelle**: `backend/tests/` (Struktur)

### Mobile (Jest)

```typescript
// Component Tests
describe('WidgetCard', () => {
	it('renders widget title', () => { ...
	});
});

// Unit Tests
describe('Auth Utils', () => {
	it('validates email', () => { ...
	});
});
```

**Quelle**: `mobile/src/__tests__/`, `mobile/package.json:L75-L85`

### E2E (Playwright)

```typescript
test.describe('@standard Auth', () => {
	test('@standard AUTH-01: Login flow', async ({page}) => { ...
	});
	test('@extended AUTH-02: Token refresh', async ({page}) => { ...
	});
});
```

**Quelle**: `tests/e2e/browseri/playwright/specs/auth.spec.ts:L1-L50`

---

## 🚨 Häufige CI-Fehler

### MyPy: „Cannot find implementation"

```
pip install types-<package>
```

**Quelle**: `.github/workflows/ci.yml:L133-L140`

### Ruff: „Line too long"

```python
# Fix: Zeile kürzen
# oder: # noqa: E501 am Zeilenende
```

### ESLint: „Unused variable"

```typescript
// Fix: Variable entfernen
// oder: // eslint-disable-next-line variable-name
```

### Jest: „Unexpected token"

```json
// Fix: tsconfig.json prüfen (strict mode)
// oder: setupFilesAfterEnv in jest-Config
```

**Quelle**: `backend/pyproject.toml:L58-L72`, `mobile/eslint.config.js`, `mobile/jest`-Section in `package.json`

---

## 📈 Monitoring & Debugging

Nach jedem Commit/PR:

1. Gehe zu **GitHub Actions** Tab
2. Klick auf den Workflow-Run
3. Schau **Jobs** für Details (Log-Output, Errors)
4. Klick auf **Artifacts** für Test-Reports (falls vorhanden)

**Quelle**: `.github/workflows/ci.yml` (Struktur)

---

## 🔗 Verwandte Dokumentation

- **Setup**: [`SETUP_AND_RUN.md`](SETUP_AND_RUN.md)
- **Konzepte**: [`TECHNICAL_CONCEPT.md`](TECHNICAL_CONCEPT.md)
- **Troubleshooting**: [`TROUBLESHOOTING.md`](development/TROUBLESHOOTING.md)

---

*Zuletzt aktualisiert: Dezember 2025*

