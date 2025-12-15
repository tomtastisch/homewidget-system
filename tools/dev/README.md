# Tools/Dev: Entwicklungs- und CI/CD-Tools

Zentrale Tools für lokale Entwicklung, Testing und CI/CD-Orchestrierung.

## Verzeichnisstruktur

```
tools/dev/
├── README.md                    # Dieses Dokument
├── pipeline/                    # CI/CD-Pipeline-Definition
│   ├── README.md
│   ├── ci_lib.sh               # Shell-Bibliothek (Logging, Befehle, etc.)
│   └── ci_steps.sh             # Pipeline-Schritte-Definition
├── orchestration/              # Orchestrierungs- und Start-Scripts
│   ├── README.md
│   ├── start.sh                # Robuster System-Start (einziger Start-Einstieg)
│   ├── run_steps.sh            # Lokaler Pipeline-Runner
│
├── lib/                        # Shell-Helper-Libs (geteilt)
├── reports/                    # Report-Generierung
│   ├── README.md
│   ├── todo_report.sh          # TODO-Bericht generieren
│   ├── quarantine_report.sh    # Quarantäne-Bericht generieren
│   └── ui_release_todo_mapping.sh
└── [Quick-Start-Scripts]
    ├── orchestration/start.sh  # Backend + Frontend starten (einziger Start-Einstieg)
    ├── run_backend.sh          # Backend allein starten
    ├── run_mobile.sh           # Mobile/Frontend allein starten
    ├── setup_dev_env.sh        # Entwicklungsumgebung aufsetzen
    └── quality.sh              # Quality-Checks (ruff + mypy)
```

## Schnelleinstieg

### 1. Entwicklungsumgebung einrichten

```bash
bash tools/dev/setup_dev_env.sh
```

**Was wird gemacht:**

- Backend-venv erstellen und Dependencies installieren
- Mobile-Dependencies via npm installieren
- Python-Importe testen

### 2. System starten

#### Start (einfach & robust in einem)

```bash
bash tools/dev/orchestration/start.sh
```

**Startet:**

- Backend auf `http://127.0.0.1:8000`
- Frontend auf `http://localhost:19006`

#### Beenden (alles stoppen)

```bash
bash tools/dev/orchestration/finalize_all.sh
```

Optionen: `--dry-run`, `--timeout=15`

### 3. Tests lokal ausführen

```bash
# Alle Pipeline-Schritte
bash tools/dev/orchestration/run_steps.sh all

# Nur Backend-Tests
bash tools/dev/orchestration/run_steps.sh backend

# Nur Mobile-Tests
bash tools/dev/orchestration/run_steps.sh mobile

# Nur E2E-Tests
bash tools/dev/orchestration/run_steps.sh tests
```

## Verschiedene Ordner erklärt

### `pipeline/` – CI/CD-Pipeline

**Zentrale Pipeline-Definition** für GitHub Actions und lokale Ausführung.

- **`ci_lib.sh`** – Gemeinsame Shell-Funktionen
    - Logging mit Farben und Timestamps
    - Befehls-Ausführung (Host oder Docker)
    - Python-Integration via PMCD
- **`ci_steps.sh`** – Alle CI-Schritte
    - Backend-Setup, Quality-Checks, Tests
    - E2E-Contract-Tests, Playwright-Tests

**Mehr:** Siehe [pipeline/README.md](pipeline/README.md)

### `orchestration/` – Orchestrierung & Start

**Scripts zum Starten und Orchestrieren des Systems.**

- **`start.sh`** – Robuster System-Start
- **`run_steps.sh`** – Lokaler Pipeline-Runner
- **`lib/`** – befindet sich in `tools/dev/lib` und wird per `source "$(dirname "$0")/../lib/*.sh"` geladen.

**Mehr:** Siehe [orchestration/README.md](orchestration/README.md)

### `reports/` – Reports

**Scripts zur Generierung von Berichten.**

- **`todo_report.sh`** – TODO-Sammlung
- **`quarantine_report.sh`** – Flaky/deaktivierte Tests
- **`ui_release_todo_mapping.sh`** – Release-Planning

**Mehr:** Siehe [reports/README.md](reports/README.md)

### Quick-Start-Scripts (direkt in `tools/dev/`)

**Schnelle Skripte für lokale Entwicklung.**

- **`orchestration/start.sh`** – Backend + Frontend starten (einziger Start-Einstieg)
- **`run_backend.sh`** – Nur Backend
- **`run_mobile.sh`** – Nur Frontend
- **`setup_dev_env.sh`** – Environment aufsetzen
- **`quality.sh`** – Code-Qualität prüfen

## Umgebungsvariablen

### Für `orchestration/start.sh`

```bash
BACKEND_HOST=127.0.0.1      # Default
BACKEND_PORT=8000           # Default
FRONTEND_HOST=localhost     # Default
FRONTEND_PORT=19006         # Default
```

### Für Pipeline / CI

```bash
USE_DOCKER_BACKEND=0        # Set to 1 für Docker
USE_DOCKER_MOBILE=0         # Set to 1 für Docker
BACKEND_IMAGE=myimage:tag
MOBILE_IMAGE=myimage:tag
```

## Workflow-Beispiele

### Lokal entwickeln

```bash
# 1. Environment aufsetzen
bash tools/dev/setup_dev_env.sh

# 2. System starten
bash tools/dev/orchestration/start.sh

# 3. Code ändern und testen
# Terminal 1: Code-Editor
# Terminal 2: Backend läuft mit Hot-Reload
# Terminal 3: Frontend läuft mit Hot-Reload
```

### Vor dem Commit

```bash
# Quality-Checks
bash tools/dev/quality.sh

# Tests ausführen
bash tools/dev/orchestration/run_steps.sh tests
```

### Vor dem Merge

```bash
# Komplette Pipeline
bash tools/dev/orchestration/run_steps.sh all
```

### Debugging

```bash
# Backend-Logs
tail -f /tmp/backend.log

# Frontend-Logs
tail -f /tmp/frontend.log

# Oder direkt in separaten Terminals
bash tools/dev/run_backend.sh
bash tools/dev/run_mobile.sh

# Alles stoppen (Ports freigeben)
bash tools/dev/orchestration/finalize_all.sh
```

## Integration mit anderen Tools

- **Python-Tools**: `tools/core/`, `tools/workflows/`, `tools/scripts/`
    - Werden via PMCD (`pmcd_run`) aus Shell-Skripten aufgerufen
- **GitHub Actions**: `.github/workflows/` nutzt `pipeline/ci_steps.sh`
- **Dokumentation**: `docs/development/` mit detaillierten Guides

## Weitere Ressourcen

- **[docs/development/README.md](../../docs/development/README.md)** – Überblick zu Entwicklungs-Dokumenten
- **[pipeline/README.md](pipeline/README.md)** – CI/CD-Pipeline Details
- **[orchestration/README.md](orchestration/README.md)** – Start-Scripts Details
- **[reports/README.md](reports/README.md)** – Report-Scripts Details

