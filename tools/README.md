# Tools Übersicht: Komplettes Projekt-Layout

## Gesamtstruktur

```
tools/
├── core/                              # Wiederverwendbare Kernlogik (Python)
│   ├── __init__.py                   # Zentrale Exports
│   ├── environment.py                # Pfade, EnvConfig, ProjectPaths
│   ├── port_manager.py               # Port-Ermittlung, TCP-Wartelogik
│   ├── shell_executor.py             # Shell-Befehle mit Logging
│   └── logging_setup.py              # Zentrales Logging
│
├── workflows/                         # Konkrete Szenarien (Python)
│   ├── __init__.py
│   ├── e2e_seeding.py                # E2E-Seed laden
│   ├── e2e_contracts.py              # E2E-Contracttests orchestrieren
│   └── port_commands.py              # CLI-Befehle für Port-Management
│
├── scripts/                           # CLI-Einstiegspunkte (Python)
│   ├── __init__.py
│   ├── __main__.py                   # Ermöglicht: python -m tools.scripts
│   └── e2e_orchestration.py          # Hauptdispatcher
│
└── dev/                               # Entwicklungs-Tools (Shell + Python Helpers)
    ├── README.md                      # Zentrale Übersicht ← START HIER
    │
    ├── pipeline/                      # CI/CD-Pipeline-Definition
    │   ├── README.md                  # Pipeline-Dokumentation
    │   ├── ci_lib.sh                  # Shell-Bibliothek (Logging, Befehle, PMCD)
    │   ├── ci_steps.sh                # Pipeline-Schritte-Definition
    │   └── __init__.py
    │
    ├── orchestration/                 # Orchestrierungs- und Start-Scripts
    │   ├── README.md                  # Orchestrierungs-Dokumentation
    │   ├── start.sh                   # Robuster System-Start
    │   ├── run_steps.sh               # Lokaler Pipeline-Runner
    │   └── lib/
    │       ├── logging.sh             # Logging-Helper
    │       ├── checks.sh              # Voraussetzungs-Checks
    │       └── services.sh            # Service-Management
    │
    ├── reports/                       # Report-Generierung
    │   ├── README.md                  # Reports-Dokumentation
    │   ├── todo_report.sh             # TODO-Sammlung
    │   ├── quarantine_report.sh       # Quarantäne-Bericht
    │   └── ui_release_todo_mapping.sh # Release-Planning
    │
    └── [Quick-Start-Scripts]          # Einfache Start-Scripts
        ├── start_local.sh             # Quick-Start (Backend + Frontend)
        ├── start_robust.sh            # Robuster Start (mit Fehlerbehandlung)
        ├── run_backend.sh             # Nur Backend starten
        ├── run_mobile.sh              # Nur Frontend starten
        ├── setup_dev_env.sh           # Entwicklungsumgebung aufsetzen
        └── quality.sh                 # Quality-Checks (ruff + mypy)

└── __init__.py                        # tools/ Paket-Init
```

## Wozu braucht man welchen Teil?

### Python-Modules (Wiederverwendbar, testbar)

| Modul                            | Wozu?                        | Beispiel                                                      |
|----------------------------------|------------------------------|---------------------------------------------------------------|
| **core/environment.py**          | Pfade und Umgebungsvariablen | `from tools.core import get_project_paths`                    |
| **core/port_manager.py**         | Port-Verwaltung              | `from tools.core import find_free_port`                       |
| **core/shell_executor.py**       | Shell-Befehle ausführen      | `from tools.core import run_cmd`                              |
| **core/logging_setup.py**        | Logging                      | `from tools.core import logger`                               |
| **workflows/e2e_seeding.py**     | E2E-Testdaten laden          | `from tools.workflows.e2e_seeding import seed_e2e`            |
| **workflows/e2e_contracts.py**   | E2E-Tests starten            | `from tools.workflows.e2e_contracts import run_e2e_contracts` |
| **scripts/e2e_orchestration.py** | CLI-Einstiegspunkt           | `python -m tools.scripts.e2e_orchestration find-free-port`    |

### Shell-Scripts (Orchestrierung und Start)

| Script                         | Wozu?                         | Aufruf                                          |
|--------------------------------|-------------------------------|-------------------------------------------------|
| **pipeline/ci_lib.sh**         | Shell-Funktionen für Pipeline | `source ci_lib.sh` (in ci_steps.sh)             |
| **pipeline/ci_steps.sh**       | Alle CI-Schritte definiert    | `bash ci_steps.sh step_backend_setup_env`       |
| **orchestration/start.sh**     | Robuster System-Start         | `bash tools/dev/orchestration/start.sh`         |
| **orchestration/run_steps.sh** | Lokaler Pipeline-Runner       | `bash tools/dev/orchestration/run_steps.sh all` |
| **dev/start_local.sh**         | Quick-Start                   | `bash tools/dev/start_local.sh`                 |
| **dev/start_robust.sh**        | Start mit Fehlerbehandlung    | `bash tools/dev/start_robust.sh`                |
| **dev/run_backend.sh**         | Nur Backend                   | `bash tools/dev/run_backend.sh`                 |
| **dev/run_mobile.sh**          | Nur Frontend                  | `bash tools/dev/run_mobile.sh`                  |
| **dev/setup_dev_env.sh**       | Environment aufsetzen         | `bash tools/dev/setup_dev_env.sh`               |
| **dev/quality.sh**             | Code-Qualität prüfen          | `bash tools/dev/quality.sh`                     |
| **reports/*.sh**               | Reports generieren            | `bash tools/dev/reports/todo_report.sh`         |

## Aufrufe von außen

### Von GitHub Actions

```yaml
# .github/workflows/*.yml
- run: bash tools/dev/pipeline/ci_steps.sh pipeline_backend
- run: bash tools/dev/pipeline/ci_steps.sh pipeline_mobile
- run: bash tools/dev/pipeline/ci_steps.sh pipeline_tests
```

### Von Developer lokal

```bash
# Setup
bash tools/dev/setup_dev_env.sh

# Start
bash tools/dev/start_local.sh
# oder
bash tools/dev/orchestration/start.sh

# Tests
bash tools/dev/orchestration/run_steps.sh all
bash tools/dev/quality.sh
```

### Von Pipeline-Skripten untereinander

```bash
# In ci_steps.sh
source tools/dev/pipeline/ci_lib.sh
run_backend_cmd "Beschreibung" "shell command"
pmcd_run find-free-port

# In run_steps.sh
bash ../pipeline/ci_steps.sh pipeline_backend
```

## Richtlinien bei neuen Features

### Brauche ich ein neues Tool?

1. **Ist es Kernlogik?** → `tools/core/`
    - Wiederverwendbar
    - Testbar ohne Shell
    - Z.B. Port-Management, Logging

2. **Ist es ein spezifisches Szenario?** → `tools/workflows/`
    - Nutzt Core-Module
    - Eigenständige Aufgabe
    - Z.B. E2E-Seeding, E2E-Tests

3. **Ist es ein CLI-Einstiegspunkt?** → `tools/scripts/`
    - Dispatcher für Workflows
    - Über `python -m` aufrufbar
    - Z.B. e2e_orchestration.py

4. **Braucht es Shell-Spezifika?** → `tools/dev/`
    - Nur wenn Shell unvermeidlich
    - Z.B. Service-Management, System-Checks
    - **Minimale Shell, maximale Python**

5. **Ist es ein Report?** → `tools/dev/reports/`

## Wichtigste Dateien zum Verstehen

1. **`tools/dev/README.md`** – Start hier für Überblick
2. **`tools/core/__init__.py`** – Alle Core-Exports
3. **`tools/scripts/e2e_orchestration.py`** – CLI-Einstiegspunkt
4. **`tools/dev/pipeline/ci_lib.sh`** – Shell-Funktionen
5. **`docs/dev/tools-structure.md`** – Detaillierte Dokumentation

## Checkliste: Alles ist aufgeräumt?

- [x] `tools/core/` existiert mit allen Modulen
- [x] `tools/workflows/` existiert mit allen Szenarien
- [x] `tools/scripts/` existiert mit CLI-Dispatcher
- [x] `tools/dev/pipeline/` enthält nur ci_lib.sh + ci_steps.sh
- [x] `tools/dev/orchestration/` enthält start.sh + run_steps.sh
- [x] `tools/dev/reports/` existiert mit Report-Scripts
- [x] Alte Dateien gelöscht (helpers.py, pipeline_py_helpers.py)
- [x] Alle Ordner haben README.md
- [x] PMCD_MODULE aktualisiert auf `tools.scripts.e2e_orchestration`

