# 🚀 Setup & Run – Homewidget System

Alle Schritte zum lokalen Starten des Systems.

---

## 📋 Voraussetzungen

- **Python 3.13+** (Backend)
- **Node 20.19.4+** (Frontend, Expo)
- **Bash 4+** (Scripts)
- **Free Ports: 8000 (Backend), 19006 (Frontend)**

**Quelle**: `tools/dev/setup_dev_env.sh:L28-L32`, `tools/dev/orchestration/start.sh:L23-L26`

---

## 1️⃣ Setup (einmalig)

```bash
bash tools/dev/setup_dev_env.sh
```

Dieser Schritt:

- Erzeugt `backend/.venv` (Python 3.13+ venv)
- Installiert Backend-Dependencies via `pip install -e .[dev]`
- Installiert Node 20.19.4 (falls nvm verfügbar)
- Installiert Mobile-Dependencies via `npm install`
- Verifiziert Imports (FastAPI, SQLModel, Pydantic)

**Quelle**: `tools/dev/setup_dev_env.sh:L22-L159`

---

## 2️⃣ Start (lokal)

```bash
bash tools/dev/orchestration/start.sh
```

Dieser Schritt:

- ✅ Prüft Prerequisites (venv, node_modules, Ports frei)
- ✅ Startet Backend: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
- ✅ Wartet auf Health-Check (`GET /health`)
- ✅ Startet Frontend: `npm run web -- --port 19006` (Expo)
- ✅ Wartet auf Web-Port 19006 erreichbar
- ✅ Zeigt URLs an

**Quelle**: `tools/dev/orchestration/start.sh:L48-L95`

**Logs**:

- Backend: `/tmp/backend.log`
- Frontend: `/tmp/frontend.log`

---

## 3️⃣ Stop

```bash
bash tools/dev/orchestration/finalize_all.sh
```

Dieser Schritt:

- Sendet SIGTERM an Backend + Frontend
- Wartet max. 10 Sekunden auf Shutdown
- Sendet ggf. SIGKILL (hartes Kill)
- Räumt PID-Files auf

**Quelle**: `tools/dev/orchestration/finalize_all.sh:L1-L150`

---

## 🌐 URLs (nach erfolgreichem Start)

| Service      | URL                          | Verwendung |
|--------------|------------------------------|------------|
| **Frontend** | http://localhost:19006       | App öffnen |
| **Backend**  | http://127.0.0.1:8000        | API-Server |
| **API-Docs** | http://127.0.0.1:8000/docs   | Swagger UI |
| **Health**   | http://127.0.0.1:8000/health | Liveness   |

**Quelle**: `tools/dev/orchestration/start.sh:L81-L83`

---

## 🔧 Umgebungsvariablen (optional)

**Backend** (vor Start setzen):

```bash
export BACKEND_PORT=8000        # Default: 8000
export BACKEND_HOST=127.0.0.1   # Default: 127.0.0.1
export ENV=dev                  # Default: dev (test if PYTEST_CURRENT_TEST)
export HW_PROFILE=dev           # Default: dev (prod/e2e für Test-Szenarien)
export SECRET_KEY=change-me      # Default: dev-secret-change-me
```

**Frontend** (vor Start setzen):

```bash
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000  # Backend-URL
export FRONTEND_PORT=19006                              # Default: 19006
export FRONTEND_HOST=localhost                          # Default: localhost
```

**Quelle**: `backend/app/core/config.py:L15-L35`, `tools/dev/orchestration/start.sh:L18-L26`

---

## ⚠️ Fehlerbehandlung

### ❌ „Ports already in use"

```bash
bash tools/dev/orchestration/finalize_all.sh
# Warte 2 Sekunden
bash tools/dev/orchestration/start.sh
```

### ❌ „venv not found" oder „node_modules not found"

```bash
bash tools/dev/setup_dev_env.sh
```

### ❌ „Python 3.13 not found"

```bash
python3 --version
# Falls < 3.13: Upgrade Python oder `PYTHON_BIN` setzen
PYTHON_BIN=/path/to/python3.13 bash tools/dev/setup_dev_env.sh
```

### ❌ Backend startet nicht (Import-Fehler)

```bash
cd backend
source .venv/bin/activate
pip install -e .[dev]
```

→ Mehr Probleme? Siehe **[development/TROUBLESHOOTING.md](development/TROUBLESHOOTING.md)**

---

*Zuletzt aktualisiert: Dezember 2025*

