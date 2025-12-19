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

## @brief Backend-Entwicklungsumgebung (uv, Abhängigkeiten) einrichten.
step_backend_setup_env() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_warn "Backend-Verzeichnis fehlt – Schritt 'Backend-Setup' wird übersprungen."
        return 0
    fi
    log_info "Initialisiere Backend-Entwicklungsumgebung über uv sync"
    ensure_uv || return 1
    uv sync --project backend --locked
}

## @brief Backend CI-Guards (uv.lock diff) ausführen.
step_backend_uv_guards() {
    log_info "Führe Backend-Guards aus..."
    git diff --exit-code uv.lock || {
        log_error "ERROR: uv.lock changed in CI. Please commit your lockfile changes."
        exit 1
    }
    uv pip check
}

## @brief Backend Security Audit (uv audit) ausführen.
step_backend_uv_audit() {
    log_info "Führe Backend Security Audit (uv audit) aus..."
    ensure_uv || return 1
    uv audit --level high
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
# E2E-Browser-Tests (Playwright)
# -----------------------------------------------------------------------------

## @brief Backend im E2E-Modus starten und auf Health-Check warten.
step_e2e_backend_start() {
    if [[ ! -d "${BACKEND_DIR}" ]]; then
        log_error "Backend-Verzeichnis fehlt – Backend-Start nicht möglich."
        return 1
    fi
    
    # Statusflag für frühe Fehlererkennung
    local status_file="/tmp/e2e_backend_status_$$"
    rm -f "${status_file}"
    
    log_info "Starte Backend im E2E-Modus (Port 8100)..."
    (
        cd "${BACKEND_DIR}" || { echo "ERROR" > "${status_file}"; exit 1; }
        
        # Backend-venv MUSS aktiviert werden (keine System-Python-Fallback)
        if [[ ! -x "${BACKEND_VENV_DIR}/bin/python" ]]; then
            log_error "Backend-venv nicht gefunden unter ${BACKEND_VENV_DIR}"
            log_error "Bitte Backend-Setup ausführen: bash tools/dev/setup_dev_env.sh"
            echo "ERROR" > "${status_file}"
            exit 1
        fi
        
        # shellcheck disable=SC1091
        source "${BACKEND_VENV_DIR}/bin/activate"
        export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"
        
        # Prüfen, ob uvicorn verfügbar ist
        if ! command -v uvicorn >/dev/null 2>&1; then
            log_error "uvicorn nicht gefunden in venv. Bitte Backend-Setup ausführen: tools/dev/setup_dev_env.sh"
            echo "ERROR" > "${status_file}"
            exit 1
        fi
        
        # Status: Backend-Start läuft
        echo "STARTING" > "${status_file}"
        
        bash "${BACKEND_DIR}/tools/start_test_backend_e2e.sh"
    ) &
    
    # local backend_pid=$! # Hintergrundprozess-ID
    
    # Warte kurz auf potentielle Startup-Fehler
    sleep 2
    
    # Prüfe Status-Flag
    if [[ -f "${status_file}" ]]; then
        local status
        status=$(cat "${status_file}")
        if [[ "${status}" == "ERROR" ]]; then
            log_error "Backend-Start ist fehlgeschlagen (siehe Fehler oben)"
            rm -f "${status_file}"
            return 1
        fi
    fi
    
    # Health-Check mit Timeout
    local health_result
    log_info "Warte auf Backend Health-Check..."
    wait_for_http "http://127.0.0.1:8100/health" 60 1 || return 1
    health_result=$?
    
    # Cleanup
    rm -f "${status_file}"
    
    return ${health_result}
}

## @brief Expo-Web im E2E-Modus starten und auf Health-Check warten.
step_e2e_expo_web_start() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_error "Mobile-Verzeichnis fehlt – Expo-Web-Start nicht möglich."
        return 1
    fi
    
    # Timing-Konfiguration kopieren (Prerequisite für App-Start)
    log_info "Kopiere Timing-Konfiguration..."
    (
        cd "${MOBILE_DIR}" || exit 1
        ensure_npm || exit 1
        node tools/copy_timing_public.mjs || {
            log_error "Fehler beim Kopieren der Timing-Konfiguration"
            exit 1
        }
    ) || return 1
    
    log_info "Starte Expo-Web im E2E-Modus (Port 19006)..."
    (
        cd "${MOBILE_DIR}" || exit 1
        ensure_npm || exit 1
        export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://127.0.0.1:8100}"
        exec npx expo start --web --port 19006
    ) &
    
    local expo_pid=$!
    
    # Kurze Wartezeit für initiale Setup-Fehler
    sleep 3
    
    # Prüfen, ob der Prozess noch läuft
    if ! kill -0 ${expo_pid} 2>/dev/null; then
        log_error "Expo-Web-Prozess ist bereits beendet (vermutlich Setup-Fehler)."
        return 1
    fi
    
    # Health-Check mit Timeout (mehr Zeit für Expo-Web)
    log_info "Warte auf Expo-Web..."
    wait_for_http "http://localhost:19006" 180 2 || return 1

    # Trigger erstes Laden der Index-Seite, damit das Dev-Bundle ggf. anläuft
    if command -v curl >/dev/null 2>&1; then
        log_info "Trigger initialen Seitenaufruf (Warm‑Up der Dev‑Bundle‑Kompilierung)..."
        curl -sS --max-time 20 "http://localhost:19006" >/dev/null || true
        sleep 2
    fi
}

## @brief Playwright-Dependencies installieren.
step_e2e_playwright_install() {
    local playwright_dir="${PROJECT_ROOT}/tests/e2e/browseri/playwright"
    if [[ ! -d "${playwright_dir}" ]]; then
        log_warn "Playwright-Verzeichnis fehlt – Installation wird übersprungen."
        return 0
    fi
    
    # Deterministic Playwright Setup
    export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${PROJECT_ROOT}/.playwright-browsers}"
    
    log_info "Installiere Playwright-Dependencies (Browsers Path: ${PLAYWRIGHT_BROWSERS_PATH})..."
    (
        cd "${playwright_dir}" || exit 1
        ensure_pnpm || exit 1

        # Laufzeit-Downloads waehrend pnpm install verhindern
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install --frozen-lockfile --prefer-offline
        
        # Explizite Installation der Browser (hier Download erlauben)
        log_info "Installiere/Verifiziere Browser-Binaries..."
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 npx playwright install --with-deps chromium
        
        log_info "Playwright-Setup abgeschlossen."
    )
}

## @brief Playwright Minimal-Tests ausführen.
step_e2e_playwright_minimal_tests() {
    local playwright_dir="${PROJECT_ROOT}/tests/e2e/browseri/playwright"
    if [[ ! -d "${playwright_dir}" ]]; then
        log_error "Playwright-Verzeichnis fehlt – Tests können nicht ausgeführt werden."
        return 1
    fi
    
    log_info "Führe Playwright Minimal-Tests aus..."
    (
        cd "${playwright_dir}" || exit 1
        ensure_npm || exit 1
        
        # Deterministic Playwright Configuration
        export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${PROJECT_ROOT}/.playwright-browsers}"
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
        
        export PLAYWRIGHT_WEB_BASE_URL="${PLAYWRIGHT_WEB_BASE_URL:-http://localhost:19006}"
        export E2E_API_BASE_URL="${E2E_API_BASE_URL:-http://127.0.0.1:8100}"
        # Minimal-Suite benötigt keinen strikten UI-Warm-Up – weich ausführen
        export PLAYWRIGHT_WARMUP_MODE="soft"
        # Server wird außerhalb von Playwright gemanagt
        export PLAYWRIGHT_NO_AUTO_START="true"
        
        log_info "Starten der Tests (Downloads deaktiviert, Path: ${PLAYWRIGHT_BROWSERS_PATH})..."
        npx playwright test --project=minimal
    )
}

## @brief Playwright Standard-Tests ausführen (Minimal + Standard).
step_e2e_playwright_standard_tests() {
    local playwright_dir="${PROJECT_ROOT}/tests/e2e/browseri/playwright"
    if [[ ! -d "${playwright_dir}" ]]; then
        log_error "Playwright-Verzeichnis fehlt – Tests können nicht ausgeführt werden."
        return 1
    fi
    
    log_info "Führe Playwright Standard-Tests aus (Minimal + Standard)..."
    (
        cd "${playwright_dir}" || exit 1
        ensure_npm || exit 1
        
        # Deterministic Playwright Configuration
        export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${PROJECT_ROOT}/.playwright-browsers}"
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
        
        export PLAYWRIGHT_WEB_BASE_URL="${PLAYWRIGHT_WEB_BASE_URL:-http://localhost:19006}"
        export E2E_API_BASE_URL="${E2E_API_BASE_URL:-http://127.0.0.1:8100}"
        # Server wird außerhalb von Playwright gemanagt
        export PLAYWRIGHT_NO_AUTO_START="true"
        
        log_info "Starten der Tests (Downloads deaktiviert, Path: ${PLAYWRIGHT_BROWSERS_PATH})..."
        npx playwright test --project=standard
    )
}

## @brief Playwright alle Tests ausführen (Minimal + Standard + Advanced).
step_e2e_playwright_all_tests() {
    local playwright_dir="${PROJECT_ROOT}/tests/e2e/browseri/playwright"
    if [[ ! -d "${playwright_dir}" ]]; then
        log_error "Playwright-Verzeichnis fehlt – Tests können nicht ausgeführt werden."
        return 1
    fi
    
    log_info "Führe alle Playwright-Tests aus (Minimal + Standard + Advanced)..."
    (
        cd "${playwright_dir}" || exit 1
        ensure_npm || exit 1
        
        # Deterministic Playwright Configuration
        export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${PROJECT_ROOT}/.playwright-browsers}"
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
        
        export PLAYWRIGHT_WEB_BASE_URL="${PLAYWRIGHT_WEB_BASE_URL:-http://localhost:19006}"
        export E2E_API_BASE_URL="${E2E_API_BASE_URL:-http://127.0.0.1:8100}"
        # Server wird außerhalb von Playwright gemanagt
        export PLAYWRIGHT_NO_AUTO_START="true"
        
        log_info "Starten der Tests (Downloads deaktiviert, Path: ${PLAYWRIGHT_BROWSERS_PATH})..."
        npx playwright test --project=advanced
    )
}

# -----------------------------------------------------------------------------
# Mobile-Schritte
# -----------------------------------------------------------------------------

## @brief Mobile-Abhängigkeiten über pnpm installieren.
step_mobile_install_deps() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Abhängigkeiten' wird übersprungen."
        return 0
    fi
    ensure_pnpm || return 1
    log_info "pnpm install (mobile, frozen-lockfile)"
    pnpm -C mobile install --frozen-lockfile
}

## @brief Mobile CI-Guards (pnpm guards) ausführen.
step_mobile_pnpm_guards() {
    log_info "Führe Mobile-Guards aus..."
    ensure_pnpm || return 1
    # Guard: recursive-install=false
    test "$(pnpm config get recursive-install)" = "false" || {
        log_error "Guard failed: recursive-install must be false"
        exit 1
    }
    # Guard: No root node_modules
    test ! -d node_modules || {
        log_error "Guard failed: root node_modules detected (Leakage)"
        exit 1
    }
    # Guard: pnpm-lock.yaml stability
    git diff --exit-code pnpm-lock.yaml || {
        log_error "ERROR: pnpm-lock.yaml changed in CI. Please commit your lockfile changes."
        exit 1
    }
}

## @brief Mobile Lockfile-Check (pnpm dedupe --check).
step_mobile_pnpm_dedupe() {
    log_info "Führe pnpm dedupe --check aus..."
    ensure_pnpm || return 1
    pnpm -C mobile dedupe --check
}

## @brief Mobile Security Audit (pnpm audit).
step_mobile_audit() {
    log_info "Führe Mobile Security Audit (pnpm audit) aus..."
    ensure_pnpm || return 1
    pnpm -C mobile audit --audit-level=high
}

## @brief Expo-Konfiguration mit expo-doctor prüfen.
step_mobile_expo_doctor() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'expo-doctor' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "expo-doctor (Konfigurationsprüfung)" \
        "pnpm exec expo-doctor"
}

## @brief Mobile Linting ausführen.
step_mobile_lint() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Linting' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "pnpm run lint (mobile)" \
        "pnpm run lint"
}

## @brief Mobile TypeScript-Check ausführen.
step_mobile_typescript_check() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile TypeScript-Check' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "pnpm exec tsc --noEmit (mobile)" \
        "pnpm exec tsc --noEmit"
}

## @brief Mobile Jest-Tests ausführen, falls ein test-Skript existiert.
step_mobile_jest_tests() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Tests' wird übersprungen."
        return 0
    fi
    # Bevorzugt ein leichtgewichtiges CI-Testskript, falls vorhanden; fallback auf 'pnpm test -- --ci'.
    run_mobile_cmd "pnpm run test:ci (mobile), falls definiert" \
        "if jq -e '.scripts[\"test:ci\"]' package.json > /dev/null 2>&1; then BABEL_CACHE_PATH='.cache/babel.json' pnpm run test:ci; \
         elif jq -e '.scripts.test' package.json > /dev/null 2>&1; then BABEL_CACHE_PATH='.cache/babel.json' pnpm test -- --ci; \
         else echo 'Kein test- oder test:ci-Skript definiert – Tests übersprungen.'; fi"
}

## @brief Mobile Build ausführen, falls ein build-Skript existiert.
step_mobile_build() {
    if [[ ! -d "${MOBILE_DIR}" ]]; then
        log_warn "Mobile-Verzeichnis fehlt – Schritt 'Mobile-Build' wird übersprungen."
        return 0
    fi
    run_mobile_cmd "pnpm run build (mobile), falls definiert" \
        "if jq -e '.scripts.build' package.json > /dev/null 2>&1; then pnpm run build; else echo 'Kein build-Skript definiert – Build-Schritt übersprungen.'; fi"
}

# -----------------------------------------------------------------------------
# Repo-weite Governance
# -----------------------------------------------------------------------------

## @brief Secrets Check via gitleaks.
step_repo_secrets() {
    log_info "Führe Secrets Check (gitleaks) aus..."
    if ! command -v gitleaks >/dev/null 2>&1; then
        log_warn "gitleaks nicht gefunden. Überspringe Check."
        return 0
    fi
    gitleaks detect --source="${PROJECT_ROOT}" --verbose --redact
}

# -----------------------------------------------------------------------------
# Aggregierte Pipeline-Schritte
# -----------------------------------------------------------------------------

## @brief Vollständige Backend-Pipeline (Setup, Guards, Qualität, Audit, Unit- + Integrationstests).
step_pipeline_backend() {
    step_backend_setup_env
    step_backend_uv_guards
    step_backend_quality
    step_backend_uv_audit
    step_backend_unit_tests
    step_backend_integration_tests
}

## @brief Vollständige Mobile-Pipeline (Deps, Guards, Dedupe, expo-doctor, Audit, Lint, TS, Jest, Build).
step_pipeline_mobile() {
    step_mobile_install_deps
    step_mobile_pnpm_guards
    step_mobile_pnpm_dedupe
    step_mobile_expo_doctor
    step_mobile_audit
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
  backend_setup_env               Backend-Entwicklungsumgebung vorbereiten (uv sync)
  backend_uv_guards               Backend-Guards (Lockfile-Check)
  backend_uv_audit                Backend-Security-Audit (uv audit)
  backend_quality                 Backend-Qualität (Ruff + MyPy)
  backend_unit_tests              Backend Unit-Tests
  backend_integration_tests       Backend Integrationstests
  e2e_contract_tests              Backend E2E-Contracttests (tests/e2e -m contract)

  e2e_backend_start               Backend im E2E-Modus starten (Port 8100)
  e2e_expo_web_start              Expo-Web im E2E-Modus starten (Port 19006)
  e2e_playwright_install          Playwright-Dependencies installieren
  e2e_playwright_minimal_tests    Playwright Minimal-Tests ausführen
  e2e_playwright_standard_tests   Playwright Standard-Tests ausführen (Minimal + Standard)
  e2e_playwright_all_tests        Playwright alle Tests ausführen (inkl. Advanced)

  mobile_install_deps             Mobile-Abhängigkeiten installieren (pnpm install)
  mobile_pnpm_guards              Mobile-Guards (pnpm config, lockfile, node_modules)
  mobile_pnpm_dedupe              Mobile-Lockfile-Check (pnpm dedupe)
  mobile_audit                    Mobile-Security-Audit (pnpm audit)
  mobile_expo_doctor              Expo-Konfiguration prüfen (expo-doctor)
  mobile_lint                     Mobile Linting
  mobile_typescript_check         Mobile TypeScript-Check
  mobile_jest_tests               Mobile Jest-Tests (falls definiert)
  mobile_build                    Mobile Build (falls definiert)

  repo_secrets                    Secrets Check (gitleaks)

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
        backend_uv_guards)
            step_backend_uv_guards
            ;;
        backend_uv_audit)
            step_backend_uv_audit
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
        e2e_backend_start)
            step_e2e_backend_start
            ;;
        e2e_expo_web_start)
            step_e2e_expo_web_start
            ;;
        e2e_playwright_install)
            step_e2e_playwright_install
            ;;
        e2e_playwright_minimal_tests)
            step_e2e_playwright_minimal_tests
            ;;
        e2e_playwright_standard_tests)
            step_e2e_playwright_standard_tests
            ;;
        e2e_playwright_all_tests)
            step_e2e_playwright_all_tests
            ;;
        mobile_install_deps)
            step_mobile_install_deps
            ;;
        mobile_pnpm_guards)
            step_mobile_pnpm_guards
            ;;
        mobile_pnpm_dedupe)
            step_mobile_pnpm_dedupe
            ;;
        mobile_audit)
            step_mobile_audit
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
        repo_secrets)
            step_repo_secrets
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