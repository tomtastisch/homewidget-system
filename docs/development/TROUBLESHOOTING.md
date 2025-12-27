# 🛠️ Troubleshooting – Homewidget System

Häufige Fehler beim Start, Setup und Testing, sowie akzeptierte Warnungen.

---

## 🔴 Setup & Start

### ❌ „Ports already in use" (8000, 19006)

**Symptom**: Backend oder Frontend startet nicht, Port wird bereits verwendet.

**Ursachen**: Prozess läuft noch vom letzten Start oder anderes Programm nutzt Port.

**Lösung**:

```bash
# Beende alle Homewidget-Prozesse
bash tools/dev/orchestration/finalize_all.sh

# Warte 2 Sekunden
sleep 2

# Versuche Neustart
bash tools/dev/orchestration/start.sh
```

**Quelle**: `tools/dev/orchestration/finalize_all.sh:L1-L150`

---

### ❌ „venv not found" oder „python3: command not found"

**Symptom**: Backend startet mit `ImportError: No module named 'app'` oder `uvicorn: command not found`.

**Ursachen**: Backend-Setup nicht durchgeführt oder Python nicht im PATH.

**Lösung**:

```bash
# Backend-Setup durchführen
bash tools/dev/setup_dev_env.sh

# Falls Python 3.13+ nicht gefunden:
python3 --version
# Falls < 3.13: Python upgraden oder setzen
PYTHON_BIN=/usr/local/bin/python3.13 bash tools/dev/setup_dev_env.sh
```

**Quelle**: `tools/dev/setup_dev_env.sh:L20-L91`

---

### ❌ „node_modules not found" oder „npm: command not found"

**Symptom**: Frontend startet nicht, `expo: command not found`.

**Ursachen**: Mobile-Setup nicht durchgeführt oder Node/npm nicht im PATH.

**Lösung**:

```bash
# Mobile-Setup durchführen
cd mobile
npm install

# Falls Node 20.19.4 nicht verfügbar:
node --version
# Falls nvm verfügbar:
nvm use 20.19.4  # oder nvm install 20.19.4
npm install
```

**Quelle**: `tools/dev/setup_dev_env.sh:L96-L152`

---

### ❌ Backend-Import-Fehler („cannot import name 'FastAPI'")

**Symptom**:

```
ModuleNotFoundError: No module named 'fastapi'
```

**Ursachen**: venv nicht aktiviert oder Dependencies nicht installiert.

**Lösung**:

```bash
cd backend
source .venv/bin/activate

# Dependencies neu installieren
pip install -e .[dev]

# Oder von Grund auf:
rm -rf .venv
bash ../tools/dev/setup_dev_env.sh
```

**Quelle**: `tools/dev/setup_dev_env.sh:L46-L72`

---

## ⚠️ Akzeptierte Warnungen

### 1. Python: ResourceWarning (unclosed database)

**Warnung**:
```
ResourceWarning: unclosed database in <sqlite3.Connection object at 0x...>
  .../inspect.py:1814
  .../_pytest/unraisableexception.py:33
```

**Status**: ✅ Akzeptiert (Stand: 2025-12-11)

**Grund**:

- Tritt nur in Test-Teardown auf (Garbage Collection)
- Stammt aus tiefen SQLAlchemy/Pydantic-Internals
- **Kein Memory-Leak** (alle Sessions werden korrekt disposed)
- Funktional keine Auswirkung (Tests bleiben grün)

**Maßnahmen durchgeführt**:

- `backend/tests/conftest.py`: `engine.dispose()` hinzugefügt
- `backend/tests/db/test_db_init.py`: Explizites `engine.dispose()`
- Resultat: Von ~10 Warnungen auf 1-2 reduziert

**Monitoring**: Bei Python 3.14+ oder SQLAlchemy 2.1+ erneut testen.

**Quelle**: `backend/tests/conftest.py` (expected)

---

### 2. pytest: PytestAssertRewriteWarning (anyio)

**Warnung**:
```
PytestAssertRewriteWarning: Module already imported so cannot be rewritten: anyio
```

**Status**: ✅ Behoben durch gezielten Filter (Stand: 2025-12-11)

**Grund**: `pytest-anyio` importiert `anyio` vor pytest's Assert-Rewriting. Funktional unkritisch.

**Maßnahme**:

```ini
# backend/pytest.ini
filterwarnings =
    ignore:Module already imported so cannot be rewritten.*anyio:pytest.PytestAssertRewriteWarning
```

**Quelle**: `backend/pytest.ini:L1-L10`

---

### 3. npm: Deprecated Dependencies (transitive)

**Warnung**:
```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory...
npm warn deprecated rimraf@...: ...
npm warn deprecated glob@...: ...
```

**Status**: ✅ Akzeptiert als Upstream-Problem (Stand: 2025-12-11)

**Grund**:

- Diese Packages sind **transitiv** (nicht direkt in dependencies)
- Sie stammen von Expo, Jest, React-Native-Tooling
- Expo 54 ist aktuelle Stable (Expo 55 Beta nicht Production-ready)
- Downgrade würde Sicherheits-Updates verlieren

**Verifikation**:
```bash
cd mobile
npm audit              # 0 vulnerabilities
expo-doctor            # 17/17 checks passed
```

**Monitoring**: Bei Expo 55/56 Major-Updates prüfen.

**Quelle**: `mobile/package.json:L32-L50`

---

## 🔍 Debug-Tipps

### Backend loggen

```bash
# Live-Logs anschauen
tail -f /tmp/backend.log

# Backend im Vordergrund starten (mehr Output)
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level debug
```

### Frontend loggen

```bash
# Live-Logs anschauen
tail -f /tmp/frontend.log

# Expo im CLI-Modus starten
cd mobile
npm run web -- --port 19006
```

### Health-Check prüfen

```bash
curl -i http://127.0.0.1:8000/health
# Erwartet: 200 OK, { "status": "ok" }

curl -i http://localhost:19006/
# Erwartet: 200 OK, HTML (Expo-Web)
```

---

## 🧪 Test-Fehler

### Backend-Tests: Database Error

**Fehler**:

```
sqlite3.OperationalError: attempt to write a readonly database
```

**Ursache**: SQLite DB im Repo ist read-only oder tmp-Verzeichnis nicht beschreibbar.

**Lösung**:

```bash
# Pytest prüft automatisch auf read-only und redirects zu /tmp/
# Falls immer noch Fehler:
rm -f backend/homewidget.db backend/test_e2e.db
bash tools/dev/setup_dev_env.sh
cd backend && pytest tests -v
```

**Quelle**: `backend/app/core/config.py:L40-L54` (Auto-Redirect zu /tmp für Test)

---

### E2E-Tests: Playwright Timeout

**Fehler**:

```
Timeout waiting for page to load
```

**Ursache**: Backend oder Frontend nicht verfügbar oder zu langsam.

**Lösung**:

```bash
# Starte Backend & Frontend manuell
bash tools/dev/pipeline/ci_steps.sh e2e_backend_start     # Port 8100
bash tools/dev/pipeline/ci_steps.sh e2e_expo_web_start    # Port 19006

# Prüfe Erreichbarkeit
curl http://127.0.0.1:8100/health
curl http://localhost:19006/

# Dann starte Tests
cd tests/e2e/browseri/playwright
npx playwright test --debug  # Debugger öffnet sich
```

**Quelle**: `tools/dev/pipeline/ci_steps.sh:L100-L190`

---

### Jest-Tests: Module Not Found

**Fehler**:

```
Cannot find module 'react-native'
```

**Ursache**: npm install nicht durchgeführt oder Cache-Problem.

**Lösung**:

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npm test
```

---

## 📊 Pipeline-Status (Stand: 2025-12-11)

### ✅ Backend

```
✅ pytest -m unit        → 7 passed
✅ pytest -m integration → 43 passed (1 ResourceWarning akzeptiert)
✅ ruff check app/       → All checks passed
✅ mypy app/             → Success: no issues found
```

### ✅ Mobile

```
✅ expo-doctor           → 17/17 checks passed
✅ npm run lint          → No lint errors
✅ npx tsc --noEmit      → No type errors
✅ npm test              → All tests passed
✅ npm run build         → Build successful
```

### ✅ E2E

```
✅ E2E-Contract-Tests    → Via tools/dev/pipeline/ci_steps.sh
✅ E2E-Browser-Tests     → Playwright (auth, home-feed, widgets)
```

**Quelle**: `.github/workflows/ci.yml:L1-L365`

---

## 📞 Hilfreiche Commands

```bash
# Setup
bash tools/dev/setup_dev_env.sh

# Start
bash tools/dev/orchestration/start.sh

# Stop
bash tools/dev/orchestration/finalize_all.sh

# Backend-Tests
cd backend && pytest tests -v

# Mobile-Tests
cd mobile && npm test

# E2E-Tests (Playwright)
cd tests/e2e/browseri/playwright && npx playwright test --ui

# Logs ansehen
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

**Quelle**: `tools/dev/orchestration/`, `mobile/package.json`, `backend/pytest.ini`

---

*Zuletzt aktualisiert: Dezember 2025*
- [SQLAlchemy Connection Pooling](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [Expo Doctor](https://docs.expo.dev/more/expo-cli/#doctor)
- [npm deprecation policy](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions)
