# CI/CD Pipeline Documentation

## Überblick

Das homewidget-system nutzt GitHub Actions für kontinuierliche Integration und Qualitätssicherung. Die CI-Pipeline validiert automatisch alle Code-Änderungen für Backend (Python/FastAPI) und Mobile (TypeScript/Expo) bei jedem Push und Pull Request.

## Pipeline-Architektur

### Workflow-Datei
- **Pfad**: `.github/workflows/ci.yml`
- **Trigger**: 
  - Push auf `main` oder `master` Branch
  - Alle Pull Requests gegen beliebige Branches
- **Runner**: Ubuntu Latest (GitHub-hosted)

### Pipeline-Phasen

Die CI-Pipeline besteht aus zwei Hauptbereichen mit klarer Trennung:

#### 1. Backend-Checks (Python)

```
┌─────────────────────────────────────────┐
│  🐍 Python 3.13 Setup                    │
│  - Setup-Python Action mit pip-Cache    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  📦 Dev Environment Setup                │
│  - Führt tools/dev/setup_dev_env.sh aus │
│  - Erstellt venv, installiert deps      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  ✨ Quality Checks                       │
│  - Ruff: Linting & Code Style           │
│  - MyPy: Type Checking                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  🧪 Tests (pytest)                       │
│  - Läuft nur wenn Tests vorhanden       │
│  - Verwendet backend/.venv               │
└─────────────────────────────────────────┘
```

#### 2. Mobile-Checks (TypeScript/React Native)

```
┌─────────────────────────────────────────┐
│  📱 Node 18 Setup                        │
│  - Setup-Node Action mit npm-Cache      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  📦 Dependencies Install                 │
│  - npm ci (clean install)               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  ✨ Linting (ESLint)                     │
│  - Führt npm run lint aus               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  🔍 TypeScript Type Check                │
│  - tsc --noEmit                          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  📦 Build Check (optional)               │
│  - Nur wenn build-Script vorhanden      │
└─────────────────────────────────────────┘
```

## Lokale Reproduktion

### Voraussetzungen

**Backend:**
- Python 3.13 oder höher
- pip und venv

**Mobile:**
- Node.js 18.x
- npm

### Setup und Quality Checks lokal ausführen

#### Komplettes Setup (Backend + Mobile)
```bash
# Einmalig: Dev-Environment einrichten
bash tools/dev/setup_dev_env.sh
```

Dieser Befehl:
- Erstellt Python venv in `backend/.venv`
- Installiert Backend-Dependencies (editable install)
- Installiert Node-Dependencies in `mobile/`
- Prüft Imports und Basis-Funktionalität

#### Backend Quality Checks
```bash
# Nur prüfen (wie in CI)
bash tools/dev/quality.sh

# Auto-Fix + Prüfen
bash tools/dev/quality.sh fix
```

Führt aus:
1. **Ruff Check**: Linting & Style (PEP8, imports, etc.)
2. **Ruff Format** (nur im fix-Mode): Code-Formatierung
3. **MyPy**: Type Checking für `app/services`, `app/core`, `app/models`

#### Backend Tests
```bash
# Tests ausführen (falls vorhanden)
source backend/.venv/bin/activate
pytest backend/tests -v
```

#### Mobile Checks
```bash
cd mobile

# Dependencies installieren
npm ci

# Linting
npm run lint

# Type Check
npx tsc --noEmit

# Build (falls definiert)
npm run build
```

## Fehlerbehebung

### Häufige Fehler und Lösungen

#### 1. MyPy Type Errors

**Symptom:**
```
backend/app/core/db.py:21: error: Argument 1 to "create_all" has incompatible type...
```

**Lösung:**
- Prüfe Type Annotations in betroffener Datei
- Achte auf korrekte Imports (z.B. `from sqlalchemy.engine import Engine`)
- Stelle sicher, dass `Optional[T]` statt `Optional[object]` verwendet wird

**Lokal testen:**
```bash
source backend/.venv/bin/activate
mypy backend/app
```

#### 2. Ruff Violations

**Symptom:**
```
backend/app/main.py:10:1: F401 [*] `logging` imported but unused
```

**Lösung:**
```bash
# Auto-fix anwenden
bash tools/dev/quality.sh fix

# Manuell prüfen
source backend/.venv/bin/activate
ruff check backend/app --fix
```

#### 3. Python Version Mismatch

**Symptom:**
```
ERROR: Package 'homewidget-backend' requires a different Python: 3.11.x not in '>=3.13'
```

**Lösung:**
- Installiere Python 3.13 oder höher
- Prüfe Version: `python3 --version`
- Alternativ: spezifische Python-Binary verwenden:
  ```bash
  PYTHON_BIN=python3.13 bash tools/dev/setup_dev_env.sh
  ```

#### 4. Mobile TypeScript Errors

**Symptom:**
```
error TS2304: Cannot find name 'process'
```

**Lösung:**
- Prüfe, ob `@types/node` in `devDependencies` vorhanden
- Reinstalliere Dependencies: `cd mobile && rm -rf node_modules && npm ci`
- Prüfe `tsconfig.json` - sollte `"node"` in `types` Array haben

#### 5. CI-Cache-Probleme

**Symptom:**
CI ist langsam oder Dependencies werden nicht gecacht

**Lösung:**
- Pip-Cache: wird automatisch via `setup-python@v5` mit `cache: 'pip'` gehandhabt
- npm-Cache: wird automatisch via `setup-node@v4` mit `cache: 'npm'` gehandhabt
- Bei Problemen: neuen Commit pushen um Cache zu invalidieren

#### 6. Setup-Script schlägt fehl

**Symptom:**
```
[setup][ERROR] [Backend] Basis-Python 'python3.13' nicht im PATH gefunden
```

**Lösung:**
```bash
# Explizit Python-Binary angeben
PYTHON_BIN=python3 bash tools/dev/setup_dev_env.sh

# Oder für spezifische Version
PYTHON_BIN=python3.13 bash tools/dev/setup_dev_env.sh
```

## CI-Konfiguration

### Wichtige Settings

**Backend:**
- Python Version: 3.13 (definiert in `backend/pyproject.toml`: `requires-python = ">=3.13"`)
- Pip Caching: aktiviert via `cache-dependency-path: 'backend/pyproject.toml'`
- Quality Tools: Ruff (linting/format), MyPy (typing)

**Mobile:**
- Node Version: 18.x (LTS)
- npm Caching: aktiviert via `cache-dependency-path: 'mobile/package-lock.json'`
- Package Manager: npm (nicht yarn/pnpm)

### Error Reporting

Die CI nutzt GitHub Actions Annotations für bessere Fehlerdarstellung:

- `::error::` - Fehler, die den Workflow fehlschlagen lassen
- `::warning::` - Warnungen ohne Workflow-Abbruch
- `::notice::` - Informative Hinweise
- `::group::` / `::endgroup::` - Gruppierte Log-Ausgaben für bessere Lesbarkeit

Beispiel im Log:
```
##[group]Backend Quality Checks
[quality] Ruff: check
All checks passed!
[quality] MyPy: typecheck
Success: no issues found in 20 source files
##[endgroup]
```

## Best Practices

### Für Entwickler

1. **Vor dem Commit:**
   ```bash
   # Backend: Quality Checks lokal ausführen
   bash tools/dev/quality.sh
   
   # Mobile: Linting und TypeCheck
   cd mobile && npm run lint && npx tsc --noEmit
   ```

2. **Bei neuen Dependencies:**
   - Backend: zu `pyproject.toml` `dependencies` oder `[project.optional-dependencies].dev` hinzufügen
   - Mobile: `npm install --save <package>` oder `npm install --save-dev <package>` nutzen
   - **Niemals** `package-lock.json` oder `backend/.venv` manuell bearbeiten

3. **Type Annotations:**
   - MyPy-Enforcement für `app/services`, `app/core`, `app/models`
   - Explizite Type Hints für öffentliche Funktionen/Methoden
   - `Optional[T]` statt `T | None` für Konsistenz im Code-Stil (beide sind ab Python 3.10+ gültig)

4. **Ruff Ignore-Rules:**
   - Aktuell ignoriert: `D` (Docstrings), `ANN` (Type Annotations überall), `B008` (FastAPI Depends())
   - Siehe `backend/pyproject.toml` `[tool.ruff.lint]`

### Für CI-Wartung

1. **Workflow-Änderungen testen:**
   - Änderungen in Feature-Branch pushen
   - Pull Request erstellen um CI zu triggern
   - Logs prüfen auf korrekte Gruppierung und Error-Messages

2. **Cache invalidieren:**
   - Bei Dependency-Problemen: Dependencies-Dateien committen
   - Cache-Keys basieren auf Hash der Dependency-Files

3. **Neue Checks hinzufügen:**
   - Immer mit `::group::` / `::endgroup::` wrappen
   - Explizite Fehlermeldungen mit `::error::`
   - Exit-Codes konsistent setzen (`exit 1` bei Fehler)

## Weiterführende Ressourcen

- **Ruff Docs**: https://docs.astral.sh/ruff/
- **MyPy Docs**: https://mypy.readthedocs.io/
- **GitHub Actions Syntax**: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **Expo Build Docs**: https://docs.expo.dev/build/introduction/

## Kontakt & Support

Bei Fragen zur CI/CD-Pipeline:
1. Prüfe diese Dokumentation
2. Schaue in die Workflow-Logs (GitHub Actions Tab)
3. Teste lokal mit den bereitgestellten Scripts
4. Bei persistierenden Problemen: Issue im Repository erstellen
