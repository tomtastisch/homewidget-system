# 🔄 CI/CD Pipeline – Homewidget System

Dokumentation der GitHub Actions Pipeline für kontinuierliche Integration und Qualitätssicherung.

---

## 📋 Überblick

Das **Homewidget System** nutzt **GitHub Actions** zur automatisierten Validierung aller Code-Änderungen:

- **Backend-Checks** (Python/FastAPI): Linting, Type-Checking, Tests
- **Mobile-Checks** (TypeScript/React Native): Linting, Type-Checking, Build-Validierung
- **Auto-Draft PR**: Neue PRs werden automatisch als Draft markiert
- **Trigger**: Push auf `main`/`master`, alle Pull Requests

---

## 📝 Auto-Draft Pull Requests

### Zweck

Alle neu erstellten Pull Requests werden **automatisch als Draft markiert**. Dies ermöglicht:

- ✅ **"Ready for Review"-Button** steht nach erfolgreichem CI-Durchlauf zur Verfügung
- ✅ Einheitlicher Workflow für alle PRs (egal ob von Copilot oder manuell erstellt)
- ✅ Reviewer werden erst benachrichtigt, wenn PR explizit als "Ready" markiert wird

### Workflow

1. **PR erstellen** (manuell oder via Copilot)
2. **Automatisch**: PR wird als Draft markiert
3. **CI-Pipeline** läuft automatisch
4. **Nach erfolgreichem CI**: Button "Ready for Review" klicken
5. **Reviewer werden benachrichtigt**

### Workflow-Datei

- **Pfad**: `.github/workflows/auto-draft-pr.yml`
- **Trigger**: Bei Erstellung neuer PRs (`opened`, `reopened`)
- **Permissions**: `pull-requests: write`

---

## 🏗️ Pipeline-Architektur

### Workflow-Datei

- **Pfad**: `.github/workflows/ci.yml`
- **Runner**: Ubuntu Latest (GitHub-hosted)
- **Dauer**: ~5-10 Minuten (abhängig von Tests)

### Backend-Pipeline (Python)

```
┌─────────────────────────────────────────┐
│ 🐍 Python 3.13 Setup │
│ - pip cache aktiviert │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ 📦 Dependencies Setup │
│ - tools/dev/setup_dev_env.sh │
│ - venv erstellen, deps installieren │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ ✨ Quality Checks │
│ - Ruff: Linting & Style │
│ - MyPy: Type Checking │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ 🧪 Tests (pytest) │
│ - cd backend && pytest │
│ - Coverage, Failure-Report │
└─────────────────────────────────────────┘
```

### Mobile-Pipeline (TypeScript)

```
┌─────────────────────────────────────────┐
│ 📱 Node 20.19.4 Setup │
│ - npm cache aktiviert │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ 📦 Dependencies Install │
│ - npm ci (clean install) │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ ✨ Linting (ESLint) │
│ - npm run lint │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ 🔍 TypeScript Type Check │
│ - tsc --noEmit │
└──────────────┬──────────────────────────┘
 ↓
┌─────────────────────────────────────────┐
│ 📦 Build Check (optional) │
│ - Falls build-Script vorhanden │
└─────────────────────────────────────────┘
```

---

## 📊 Quality-Gates

Für einen erfolgreichen PR müssen bestehen:

### Backend (Python)

- ✅ **Linting (Ruff)**: Keine Style-Fehler
- ✅ **Type-Checking (MyPy)**: Keine Type-Fehler (strict mode)
- ✅ **Tests (pytest)**: Alle Tests grün
- ✅ **Coverage**: Mindestens 80% (optional, konfigurierbar)

### Mobile (TypeScript)

- ✅ **Linting (ESLint)**: Keine Fehler/Warnungen
- ✅ **Type-Checking (tsc)**: Keine Type-Fehler (strict mode)
- ✅ **Build**: Erfolgreiches Compilation
- ✅ **Tests**: Alle Tests grün

---

## 🖥️ Lokale Reproduktion

### Setup (einmalig)

```bash
bash tools/dev/setup_dev_env.sh
```

Dies erstellt venv und installiert alle Dependencies.

### Backend-Checks lokal

```bash
cd backend
ruff check .
mypy .
pytest
```

### Mobile-Checks lokal

```bash
cd mobile
npm run lint
npx tsc --noEmit
```

---

## 🚨 Häufige Fehler & Lösungen

### MyPy-Fehler: `Cannot find implementation`

```bash
pip install types-xyz
```

### Ruff: `Line too long`

- Zeile kürzen oder `# noqa: E501` nutzen

### ESLint: `Unused variable`

- Variable entfernen oder `// eslint-disable-next-line` nutzen

---

## 📈 Monitoring

Nach jedem Commit/PR:

1. Gehe zu **Actions** Tab im Repository
2. Klick auf den Workflow-Run
3. Schau **Jobs** für detaillierte Output

---

## 🔧 Configuration Files

**Backend**: `pyproject.toml`, `mypy.ini`, `pytest.ini`

**Mobile**: `eslint.config.js`, `tsconfig.json`

---

## 📚 Links & Ressourcen

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Ruff**: https://docs.astral.sh/ruff/
- **MyPy**: https://mypy.readthedocs.io/
- **ESLint**: https://eslint.org/docs/

---

*Zuletzt aktualisiert: Dezember 2025*

