# Pipeline: CI-Steps und Hilfsfunktionen

Zentrale CI/CD-Pipeline-Definition mit wiederverwendbaren Shell-Funktionen.

## Dateien

### `ci_lib.sh`

**Gemeinsame Shell-Bibliothek** mit Hilfsfunktionen für alle Pipeline-Skripte.

**Funktionen:**

- **Logging**: `log_info`, `log_warn`, `log_error` (mit Farben und Timestamps)
- **Anforderungs-Checks**: `require_cmd`, `ensure_npm`
- **Environment**: `activate_backend_venv`, `get_project_root`
- **Befehls-Ausführung**: `run_backend_cmd`, `run_mobile_cmd`
- **Python-Integration**: `pmcd_run` (PMCD = Python Method Commander Distribution)
- **Health-Checks**: `wait_for_http_health`

**Verwendung:**

```bash
# In ci_steps.sh oder anderen Skripten
source "$(dirname -- "${BASH_SOURCE[0]}")/ci_lib.sh"

# Dann nutzen:
log_info "Das ist eine Info"
run_backend_cmd "Beschreibung" "shell command"
pmcd_run find-free-port
```

### `ci_steps.sh`

**Zentrale Pipeline-Schritte-Definition** für Backend, Mobile und E2E-Tests.

**Verfügbare Schritte:**

- `step_backend_setup_env` – venv, Dependencies installieren
- `step_backend_quality` – ruff + mypy (Code-Qualität)
- `step_backend_unit_tests` – Unit-Tests ausführen
- `step_backend_integration_tests` – Integration-Tests ausführen
- `step_e2e_contract_tests` – Systemweite Contract-Tests
- `step_e2e_backend_start` – Backend im E2E-Modus starten
- `step_e2e_playwright_tests` – Browser-Tests (Playwright)
- Und weitere...

**Verwendung:**

```bash
# Einzelne Schritte aufrufen
bash ci_steps.sh step_backend_setup_env
bash ci_steps.sh step_backend_quality
bash ci_steps.sh step_backend_unit_tests

# Oder über Pipeline-Ziele
bash ci_steps.sh pipeline_backend    # Backend-Pipeline
bash ci_steps.sh pipeline_mobile     # Mobile-Pipeline
bash ci_steps.sh pipeline_tests      # Test-Pipeline
bash ci_steps.sh pipeline_all        # Alles
```

## Python-Integration (PMCD)

Komplexe Orchestrierungs-Aufgaben sind in Python implementiert unter `tools/core/`, `tools/workflows/` und
`tools/scripts/`.

Diese werden über `ci_lib.sh` aufgerufen:

```bash
# In ci_lib.sh definiert:
PMCD_MODULE="tools.scripts.e2e_orchestration"

# Verfügbare Kommandos:
pmcd_run find-free-port           # Findet freien TCP-Port
pmcd_run wait-for-backend         # Wartet auf Backend-Erreichbarkeit
pmcd_run seed-e2e                 # Lädt E2E-Testdaten
pmcd_run run-e2e-contracts        # Startet Backend + führt Tests aus
```

**Entsprechende Python-Module:**

- `tools.workflows.port_commands` – `find_free_port_cmd`, `wait_for_backend_cmd`
- `tools.workflows.e2e_seeding` – `seed_e2e`
- `tools.workflows.e2e_contracts` – `run_e2e_contracts`

## Docker-Support

Beide `ci_steps.sh` und `ci_lib.sh` unterstützen optional Docker-Container für CI:

```bash
# Backend in Docker ausführen
USE_DOCKER_BACKEND=1 BACKEND_IMAGE=myimage:tag bash ci_steps.sh pipeline_backend

# Mobile in Docker ausführen
USE_DOCKER_MOBILE=1 MOBILE_IMAGE=myimage:tag bash ci_steps.sh pipeline_mobile
```

## Verzeichnisstruktur

```
tools/dev/pipeline/
├── README.md           # Dieses Dokument
├── ci_lib.sh          # Gemeinsame Shell-Funktionen
└── ci_steps.sh        # Pipeline-Schritte
```

## Integration mit anderen Tools

- **Orchestration**: `ci_steps.sh` wird von `tools/dev/orchestration/run_steps.sh` aufgerufen
- **Reports**: Separate Scripts in `tools/dev/reports/`
- **Python-Tools**: `ci_lib.sh` ruft Python-Module über PMCD auf
- **GitHub Actions**: `.github/workflows/` nutzt `ci_steps.sh`

## Verwendungsbeispiele

### Lokal Backend-Tests ausführen

```bash
bash tools/dev/pipeline/ci_steps.sh step_backend_setup_env
bash tools/dev/pipeline/ci_steps.sh step_backend_quality
bash tools/dev/pipeline/ci_steps.sh step_backend_unit_tests
```

### Komplette Pipeline lokal

```bash
bash tools/dev/orchestration/run_steps.sh all
```

### E2E-Tests mit automatischer Orchestrierung

```bash
bash tools/dev/pipeline/ci_steps.sh step_e2e_contract_tests
```

