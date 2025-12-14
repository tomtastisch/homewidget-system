#!/usr/bin/env bash

## @file ci_lib.sh
## @brief Gemeinsame Hilfsfunktionen und Konstanten für CI-Skripte.
##
## Wird typischerweise aus ci_steps.sh wie folgt eingebunden:
##   source "$(dirname -- "${BASH_SOURCE[0]}")/ci_lib.sh"

# -----------------------------------------------------------------------------
# Bash-Version prüfen
# -----------------------------------------------------------------------------

if [[ -z "${BASH_VERSINFO:-}" || "${BASH_VERSINFO[0]}" -lt 4 ]]; then
    echo "[ci-lib][ERROR] Dieses Skript benötigt Bash >= 4 (assoziative Arrays)." >&2
    # Falls als Library gesourced → return, sonst exit
    return 1 2>/dev/null || exit 1
fi

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

COLOR_RESET="\033[0m"
COLOR_INFO="\033[36m"
COLOR_WARN="\033[33m"
COLOR_ERROR="\033[31m"

timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

_ci_log() {
    # _ci_log LEVEL COLOR MESSAGE...
    local level="$1"
    local color="$2"
    shift 2
    if [[ -n "${NO_COLOR:-}" ]]; then
        color=""
        COLOR_RESET=""
    fi
    printf "[%s] [ci-steps] [%s] %b%s%b\n" "$(timestamp)" "${level}" "${color}" "$*" "${COLOR_RESET}"
}

log_info() {
    _ci_log INFO "${COLOR_INFO}" "$@"
}

log_warn() {
    _ci_log WARN "${COLOR_WARN}" "$@"
}

log_error() {
    _ci_log ERROR "${COLOR_ERROR}" "$@" >&2
}

# -----------------------------------------------------------------------------
# Konstanten und Pfade
# -----------------------------------------------------------------------------

# Hinweis: BASH_SOURCE[0] verweist auf das aufrufende Skript (z. B. ci_steps.sh),
# nicht auf diese Library – beide liegen aber im selben Verzeichnis.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." &>/dev/null && pwd)"


BACKEND_DIR="${PROJECT_ROOT}/backend"
MOBILE_DIR="${PROJECT_ROOT}/mobile"
BACKEND_VENV_DIR="${BACKEND_DIR}/.venv"

# Optionale Container-Konfiguration
BACKEND_IMAGE="${BACKEND_IMAGE:-homewidget-backend-ci:local}"
MOBILE_IMAGE="${MOBILE_IMAGE:-homewidget-mobile-ci:local}"
USE_DOCKER_BACKEND="${USE_DOCKER_BACKEND:-0}"
USE_DOCKER_MOBILE="${USE_DOCKER_MOBILE:-0}"

# Python-Helfer-Modul für PMCD (modernisierte Struktur)
PMCD_MODULE="tools.scripts.e2e_orchestration"

# -----------------------------------------------------------------------------
# Generische Hilfsfunktionen
# -----------------------------------------------------------------------------

## @brief Prüft, ob ein Kommando im PATH vorhanden ist.
## @param $1 Kommandoname
require_cmd() {
    local cmd="$1"
    if ! command -v "${cmd}" >/dev/null 2>&1; then
        log_error "Erforderliches Kommando '${cmd}' wurde nicht gefunden."
        return 1
    fi
    return 0
}

## @brief Stellt sicher, dass npm im PATH verfügbar ist (ggf. via nvm, Node 20.19.4).
ensure_npm() {
    if command -v npm >/dev/null 2>&1; then
        return 0
    fi

    if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
        log_info "npm nicht gefunden – initialisiere Node 20.19.4 via nvm (NVM_DIR)."
        # shellcheck disable=SC1090
        . "${NVM_DIR}/nvm.sh"
    elif [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
        log_info "npm nicht gefunden – initialisiere Node 20.19.4 via nvm (~/.nvm)."
        # shellcheck disable=SC1090
        . "${HOME}/.nvm/nvm.sh"
    else
        log_error "npm wurde nicht gefunden und nvm ist nicht verfügbar. Bitte Node-Umgebung initialisieren (z. B. 'nvm use 20.19.4')."
        return 1
    fi

    nvm use 20.19.4 >/dev/null

    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm ist trotz nvm-Initialisierung nicht im PATH. Bitte Node-Umgebung prüfen."
        return 1
    fi
}

## @brief Aktiviert die Backend-venv, falls vorhanden.
activate_backend_venv() {
    if [[ ! -x "${BACKEND_VENV_DIR}/bin/python" ]]; then
        log_error "Backend-venv wurde nicht gefunden. Bitte tools/dev/setup_dev_env.sh ausführen."
        return 1
    fi
    # shellcheck disable=SC1091
    source "${BACKEND_VENV_DIR}/bin/activate"
    export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"
    log_info "Backend-venv aktiviert: Python $(python --version 2>&1)"
}

## @brief Führt einen Shell-Befehl im Backend-Container oder auf dem Host aus.
## @param $1 Beschreibung (für Logging)
## @param $2... Befehl
run_backend_cmd() {
    local desc="$1"
    shift
    if [[ "${USE_DOCKER_BACKEND}" == "1" ]]; then
        require_cmd docker || return 1
        log_info "Backend-Container-Befehl: ${desc}"
        docker run --rm \
            -v "${PROJECT_ROOT}:${PROJECT_ROOT}" \
            -w "${PROJECT_ROOT}" \
            "${BACKEND_IMAGE}" \
            bash -lc "$*"
    else
        log_info "Backend-Host-Befehl: ${desc}"
        activate_backend_venv || return 1
        bash -lc "cd '${PROJECT_ROOT}' && $*"
    fi
}

## @brief Führt einen Shell-Befehl im Mobile-Container oder auf dem Host aus.
## @param $1 Beschreibung (für Logging)
## @param $2... Befehl
run_mobile_cmd() {
    local desc="$1"
    shift
    if [[ "${USE_DOCKER_MOBILE}" == "1" ]]; then
        require_cmd docker || return 1
        log_info "Mobile-Container-Befehl: ${desc}"
        docker run --rm \
            -v "${PROJECT_ROOT}:${PROJECT_ROOT}" \
            -w "${MOBILE_DIR}" \
            "${MOBILE_IMAGE}" \
            bash -lc "$*"
    else
        log_info "Mobile-Host-Befehl: ${desc}"
        (
            cd "${MOBILE_DIR}" || exit 1
            ensure_npm || exit 1

            local cmd="$*"
            bash -lc "${cmd}"
        )
    fi
}

# -----------------------------------------------------------------------------
# PMCD – Python Method Commander Distribution
# -----------------------------------------------------------------------------

## @brief Führt eine Python-Unterkommandofunktion im Helfer-Modul aus.
##        Erwartet, dass eine passende Python-Umgebung aktiv ist
##        (insbesondere für app.*-Imports die Backend-venv).
##
## Beispiel:
##   pmcd_run find-free-port
##   pmcd_run run-e2e-contracts
pmcd_run() {
    local subcommand="$1"
    shift || true

    if ! command -v python >/dev/null 2>&1; then
        log_error "python wurde nicht gefunden. Bitte Python-Umgebung aktivieren."
        return 1
    fi

    python -m "${PMCD_MODULE}" "${subcommand}" "$@"
}

# -----------------------------------------------------------------------------
# Health-Check-Funktionen für E2E-Setup
# -----------------------------------------------------------------------------

## @brief Wartet darauf, dass eine HTTP-URL erreichbar wird (Health-Check mit Timeout).
## @param $1 URL (z.B. http://127.0.0.1:8100/health)
## @param $2 Max. Anzahl Versuche (Standard: 60)
## @param $3 Wartezeit zwischen Versuchen in Sekunden (Standard: 1)
## @return 0 bei Erfolg, 1 bei Timeout
wait_for_http() {
    local url="$1"
    local max_attempts="${2:-60}"
    local sleep_time="${3:-1}"

    log_info "Warte auf ${url}..."

    local attempt=1
    while [[ ${attempt} -le ${max_attempts} ]]; do
        if curl -fsS "${url}" >/dev/null 2>&1; then
            log_info "Service ist bereit (nach ${attempt} Versuchen)."
            return 0
        fi
        sleep "${sleep_time}"
        ((attempt++))
    done

    local total_time=$((max_attempts * sleep_time))
    log_error "Service wurde nicht rechtzeitig erreichbar (Timeout nach ${total_time} Sekunden)"
    return 1
}

## @brief Deprecated – nutze wait_for_http stattdessen
## @deprecated Use wait_for_http() instead
wait_for_http_health() {
    wait_for_http "$@"
}
