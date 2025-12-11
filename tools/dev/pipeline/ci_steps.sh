#!/usr/bin/env bash
set -Eeuo pipefail

## @file ci_steps.sh
## @brief Zentrale, wiederverwendbare CI-Schritte für Backend und Mobile.
##
## Dieses Skript enthält alle logischen Schritte, die in der CI-Pipeline
## und lokal (run_steps.sh) ausgeführt werden.
##
## Voraussetzungen (Host/Container):
##   - Bash >= 4 (assoziative Arrays)
##   - Für Backend-Hostlauf:
##       * Python >= 3.13
##       * backend/.venv (wird durch tools/dev/setup_dev_env.sh erzeugt)
##       * pytest, ruff, mypy in der venv
##   - Für Mobile-Hostlauf:
##       * Node >= 20 (z. B. via nvm use 20)
##       * npm, npx
##       * expo-cli via npx (devDependency)
##   - Optional:
##       * Docker, falls USE_DOCKER_BACKEND/USE_DOCKER_MOBILE=1 gesetzt sind

# -----------------------------------------------------------------------------
# Library einbinden
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
# shellcheck source=ci_lib.sh
. "${SCRIPT_DIR}/ci_lib.sh"

# -----------------------------------------------------------------------------
# Backend-Schritte
# -----------------------------------------------------------------------------

## @brief Backend-Entwicklungsumgebung (venv, Abhängigkeiten) einrichten.
step_backend_setup_env() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_warn "Backend-Verzeichnis fehlt – Schritt 'Backend-Setup' wird übersprungen."
        return 0
    fi
    log_info "Initialisiere Backend-Entwicklungsumgebung über tools/dev/setup_dev_env.sh"
    PYTHON_BIN=python3 bash "${PROJECT_ROOT}/tools/dev/setup_dev_env.sh"
}

## @brief Backend-Linting und Typprüfung (Ruff + MyPy) ausführen.
step_backend_quality() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_warn "Backend-Verzeichnis fehlt – Schritt 'Backend-Qualität' wird übersprungen."
        return 0
    fi
    run_backend_cmd "Backend-Qualität (ruff + mypy)" \
        "bash '${PROJECT_ROOT}/tools/dev/quality.sh'"
}

## @brief Backend Unit-Tests mit pytest ausführen.
step_backend_unit_tests() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_warn "Backend-Verzeichnis fehlt – Schritt 'Backend Unit-Tests' wird übersprungen."
        return 0
    fi
    run_backend_cmd "pytest Unit-Tests (backend/tests -m unit)" \
        "cd backend && pytest tests -m 'unit' -v --tb=short"
}

## @brief Backend Integrationstests mit pytest ausführen.
step_backend_integration_tests() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_warn "Backend-Verzeichnis fehlt – Schritt 'Backend Integrationstests' wird übersprungen."
        return 0
    fi
    run_backend_cmd "pytest Integrationstests (backend/tests -m integration)" \
        "cd backend && pytest tests -m 'integration' -v --tb=short"
}

# -----------------------------------------------------------------------------
# E2E-/systemweite Contract-Tests
# -----------------------------------------------------------------------------

## @brief Systemweite E2E-/Contracttests (tests/e2e, marker=contract) ausführen.
step_e2e_contract_tests() {
    if [[ ! -d "${PROJECT_ROOT}/tests/e2e" ]]; then
        log_warn "Kein tests/e2e-Verzeichnis vorhanden – E2E-Contracttests werden übersprungen."
        return 0
    fi
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_error "Backend-Verzeichnis fehlt – E2E-Contracttests können nicht ausgeführt werden."
        return 1
    fi

    # Ausführung erfolgt vollständig in Python (uvicorn + pytest) über PMCD.
    run_backend_cmd "E2E-Contracttests (pytest -m contract via Python-Helfer)" \
        "source '${SCRIPT_DIR}/ci_lib.sh'; pmcd_run run-e2e-contracts"
}

# -----------------------------------------------------------------------------
# Mobile-Schritte
# -----------------------------------------------------------------------------

## @brief Mobile-Abhängigkeiten über npm ci installieren.
step_mobile_install_deps() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Abhängigkeiten' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "npm ci (mobile)" \
        "npm ci --no-fund --no-audit"
}

## @brief Expo-Konfiguration mit expo-doctor prüfen.
step_mobile_expo_doctor() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'expo-doctor' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "expo-doctor (Konfigurationsprüfung)" \
        "npx expo-doctor"
}

## @brief Mobile Linting ausführen.
step_mobile_lint() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Linting' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "npm run lint (mobile)" \
        "npm run lint"
}

## @brief Mobile TypeScript-Check ausführen.
step_mobile_typescript_check() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile TypeScript-Check' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "npx tsc --noEmit (mobile)" \
        "npx tsc --noEmit"
}

## @brief Mobile Jest-Tests ausführen, falls ein test-Skript existiert.
step_mobile_jest_tests() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Tests' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "npm test (mobile), falls definiert" \
        "if jq -e '.scripts.test' package.json > /dev/null 2>&1; then npm test -- --ci --runInBand; else echo 'Kein test-Skript definiert – Tests übersprungen.'; fi"
}

## @brief Mobile Build ausführen, falls ein build-Skript existiert.
step_mobile_build() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Build' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "npm run build (mobile), falls definiert" \
        "if jq -e '.scripts.build' package.json > /dev/null 2>&1; then npm run build; else echo 'Kein build-Skript definiert – Build-Schritt übersprungen.'; fi"
}

# -----------------------------------------------------------------------------
# Aggregierte Pipeline-Schritte
# -----------------------------------------------------------------------------

## @brief Vollständige Backend-Pipeline (Setup, Qualität, Unit- + Integrationstests).
step_pipeline_backend() {
    step_backend_setup_env
    step_backend_quality
    step_backend_unit_tests
    step_backend_integration_tests
}

## @brief Vollständige Mobile-Pipeline (Deps, expo-doctor, Lint, TS, Jest, Build).
step_pipeline_mobile() {
    step_mobile_install_deps
    step_mobile_expo_doctor
    step_mobile_lint
    step_mobile_typescript_check
    step_mobile_jest_tests
    step_mobile_build
}

## @brief Vollständige Pipeline (Backend + E2E-Contracts + Mobile).
step_pipeline_all() {
    step_pipeline_backend
    step_e2e_contract_tests
    step_pipeline_mobile
}

## @brief Nur Test-Pipeline (Backend-Tests inkl. E2E, Mobile-Tests).
step_pipeline_tests() {
    step_backend_unit_tests
    step_backend_integration_tests
    step_e2e_contract_tests
    step_mobile_jest_tests
}

# -----------------------------------------------------------------------------
# CLI-Dispatcher
# -----------------------------------------------------------------------------

usage() {
    cat <<USAGE
Verwendung: tools/dev/pipeline/ci_steps.sh <kommando>

Verfügbare Kommandos:
  backend_setup_env               Backend-Entwicklungsumgebung vorbereiten
  backend_quality                 Backend-Qualität (Ruff + MyPy)
  backend_unit_tests              Backend Unit-Tests
  backend_integration_tests       Backend Integrationstests
  e2e_contract_tests              Backend E2E-Contracttests (tests/e2e -m contract)

  mobile_install_deps             Mobile-Abhängigkeiten installieren (npm ci)
  mobile_expo_doctor              Expo-Konfiguration prüfen (expo-doctor)
  mobile_lint                     Mobile Linting
  mobile_typescript_check         Mobile TypeScript-Check
  mobile_jest_tests               Mobile Jest-Tests (falls definiert)
  mobile_build                    Mobile Build (falls definiert)

  pipeline_backend                Backend-Pipeline (Setup + Qualität + Unit/Integrationstests)
  pipeline_mobile                 Mobile-Pipeline (Deps + expo-doctor + Lint + TS + Tests + Build)
  pipeline_all                    Vollständige Pipeline (Backend + E2E-Contracts + Mobile)
  pipeline_tests                  Nur Test-Pipeline (Backend-Tests + E2E + Mobile-Tests)
USAGE
}

main() {
    local cmd="${1:-}"
    if [[ -z "${cmd}" ]]; then
        usage
        exit 1
    fi

    case "${cmd}" in
        backend_setup_env)
            step_backend_setup_env
            ;;
        backend_quality)
            step_backend_quality
            ;;
        backend_unit_tests)
            step_backend_unit_tests
            ;;
        backend_integration_tests)
            step_backend_integration_tests
            ;;
        e2e_contract_tests)
            step_e2e_contract_tests
            ;;
        mobile_install_deps)
            step_mobile_install_deps
            ;;
        mobile_expo_doctor)
            step_mobile_expo_doctor
            ;;
        mobile_lint)
            step_mobile_lint
            ;;
        mobile_typescript_check)
            step_mobile_typescript_check
            ;;
        mobile_jest_tests)
            step_mobile_jest_tests
            ;;
        mobile_build)
            step_mobile_build
            ;;
        pipeline_backend)
            step_pipeline_backend
            ;;
        pipeline_mobile)
            step_pipeline_mobile
            ;;
        pipeline_all)
            step_pipeline_all
            ;;
        pipeline_tests)
            step_pipeline_tests
            ;;
        *)
            log_error "Unbekanntes Kommando: ${cmd}"
            usage
            exit 1
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi