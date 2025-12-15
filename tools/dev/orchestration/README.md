# Orchestration: System-Start Scripts

Zentrale Scripts zur Orchestrierung und zum Start des gesamten Homewidget-Systems.

## Verfügbare Skripte

### `start.sh`

Robuster Start von Backend und Frontend mit automatischer Fehlererkennung.

```bash
# Standard: Backend auf 8000, Frontend auf 19006
bash tools/dev/orchestration/start.sh

# Mit benutzerdefinierten Ports
BACKEND_PORT=8001 FRONTEND_PORT=19007 bash tools/dev/orchestration/start.sh
```

**Features:**

- Prüft Voraussetzungen (venv, node_modules, Ports)
- Startet Backend (Uvicorn) und Frontend (Expo Web) in parallelen Prozessen
- Wartet auf Health-Checks
- Sauberes Cleanup bei Beendigung
- Detaillierte Logging-Ausgaben

### `finalize_all.sh`

Beendet zuverlässig alle laufenden Projekt‑Dev‑Server (Backend/uvicorn, Frontend/Expo), unabhängig von Ports oder
Mehrfachinstanzen.

```bash
# Standard: sanftes Beenden (SIGTERM), danach ggf. SIGKILL
bash tools/dev/orchestration/finalize_all.sh

# Optionen
bash tools/dev/orchestration/finalize_all.sh --dry-run       # nur anzeigen
bash tools/dev/orchestration/finalize_all.sh --timeout=15    # Wartezeit in Sekunden
```

**Eigenschaften:**

- Erkennt Prozesse über offene TCP‑Listener und prüft, ob Projektdateien geöffnet sind (sicher gegen Fremdprozesse)
- Nutzt ggf. PID‑Files (`/tmp/backend.pid`, `/tmp/frontend.pid`)
- Idempotent (mehrfach ausführbar)

### `run_steps.sh`

Lokaler Pipeline-Runner für die Ausführung von CI-Schritten ohne GitHub Actions.

```bash
# Komplette Pipeline
bash tools/dev/orchestration/run_steps.sh all

# Nur Backend-Tests
bash tools/dev/orchestration/run_steps.sh backend

# Nur Mobile-Tests
bash tools/dev/orchestration/run_steps.sh mobile

# Nur E2E-Tests
bash tools/dev/orchestration/run_steps.sh tests
```

**Schritte, die ausgeführt werden:**

- Backend Environment-Setup
- Quality-Checks (ruff, mypy)
- Unit-Tests und Integration-Tests
- E2E-Contract-Tests und Playwright-Tests

## Umgebungsvariablen

### `start.sh`

```bash
BACKEND_HOST=127.0.0.1      # Backend-Host (default)
BACKEND_PORT=8000            # Backend-Port (default)
FRONTEND_HOST=localhost      # Frontend-Host (default)
FRONTEND_PORT=19006          # Frontend-Port (default)
```

### `run_steps.sh`

Nutzt alle Standard-CI-Variablen aus `pipeline/ci_lib.sh`:

```bash
BACKEND_IMAGE=homewidget-backend-ci:local
MOBILE_IMAGE=homewidget-mobile-ci:local
USE_DOCKER_BACKEND=0         # Set to 1 für Container-Ausführung
USE_DOCKER_MOBILE=0          # Set to 1 für Container-Ausführung
```

## Verzeichnisstruktur

```
tools/dev/orchestration/
├── README.md               # Dieses Dokument
├── start.sh                # Robuster System-Start
└── run_steps.sh            # CI-Pipeline-Runner

tools/dev/lib/              # Shell-Libraries (geteilt)
├── logging.sh              # Logging-Funktionen
├── checks.sh               # Voraussetzungs-Checks
└── services.sh             # Service-Management
```

## Debugging

### Logs anschauen

```bash
# Backend-Log (nach start.sh)
tail -f /tmp/backend.log

# Frontend-Log
tail -f /tmp/frontend.log
```

### Port-Konflikte beheben

```bash
# Port 8000 freigeben
lsof -tiTCP:8000 -sTCP:LISTEN | xargs kill -9

# Port 19006 freigeben
lsof -tiTCP:19006 -sTCP:LISTEN | xargs kill -9
```

## Integration mit anderen Tools

- **Pipeline**: `run_steps.sh` ruft `tools/dev/pipeline/ci_steps.sh` auf
- **Reports**: Reports liegen in `tools/dev/reports/`
- **Core-Tools**: Nutzt Python-Module aus `tools/core/` und `tools/workflows/`

