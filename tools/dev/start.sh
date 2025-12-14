#!/usr/bin/env bash

################################################################################
# HOMEWIDGET START SCRIPT – Einzige Shell zum Starten von Backend + Frontend
################################################################################
# Startet Backend (uvicorn) + Frontend (Expo Web) in separaten Prozessen
#
# Features:
# - Prüft Voraussetzungen (Python, npm, Ports)
# - Health-Checks vor Fertig-Meldung
# - Sauberes Cleanup bei Beendigung (Ctrl+C)
# - Klare Fehlermeldungen
#
# Verwendung:
#   bash tools/dev/start.sh                    # Standard (8000, 19006)
#   BACKEND_PORT=8001 bash tools/dev/start.sh  # Custom Port
#
# Troubleshooting:
#   Port belegt? → lsof -ti:8000 | xargs kill -9
#   Backend crashed? → tail -f /tmp/homewidget-backend.log
#   Frontend crashed? → tail -f /tmp/homewidget-frontend.log

set -Eeuo pipefail

################################################################################
# SETUP
################################################################################

log_info() { echo "[✓] $1"; }
log_warn() { echo "[⚠️] $1" >&2; }
log_error() { echo "[✗] ERROR: $1" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
MOBILE_DIR="${PROJECT_ROOT}/mobile"

BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-19006}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"

LOG_BACKEND="/tmp/homewidget-backend.log"
LOG_FRONTEND="/tmp/homewidget-frontend.log"

################################################################################
# PREREQUISITE CHECKS
################################################################################

check_prereqs() {
    log_info "Prüfe Voraussetzungen..."

    # Python
    if ! command -v python3 &>/dev/null; then
        log_error "python3 nicht gefunden"
    fi
    local py_version=$(python3 --version | awk '{print $2}')
    log_info "Python: $py_version"

    # npm
    if ! command -v npm &>/dev/null; then
        log_error "npm nicht gefunden"
    fi
    local npm_version=$(npm --version)
    log_info "npm: $npm_version"

    # Backend venv
    if [[ ! -d "${BACKEND_DIR}/.venv" ]]; then
        log_error "Backend venv nicht gefunden - Führe 'bash tools/dev/setup_dev_env.sh' aus"
    fi

    # Frontend dependencies
    if [[ ! -d "${MOBILE_DIR}/node_modules" ]]; then
        log_error "Frontend Dependencies nicht gefunden - Führe 'cd mobile && npm install' aus"
    fi

    # Ports frei?
    local backend_pid=$(lsof -ti ":${BACKEND_PORT}" 2>/dev/null || true)
    if [[ -n "$backend_pid" ]]; then
        log_error "Port ${BACKEND_PORT} ist belegt (PID: $backend_pid) - Führe aus: kill -9 $backend_pid"
    fi

    local frontend_pid=$(lsof -ti ":${FRONTEND_PORT}" 2>/dev/null || true)
    if [[ -n "$frontend_pid" ]]; then
        log_error "Port ${FRONTEND_PORT} ist belegt (PID: $frontend_pid) - Führe aus: kill -9 $frontend_pid"
    fi

    log_info "Alle Voraussetzungen erfüllt ✓"
}

################################################################################
# START BACKEND
################################################################################

start_backend() {
    log_info ""
    log_info "🚀 BACKEND STARTEN..."

    cd "${BACKEND_DIR}"
    source .venv/bin/activate

    # Starte uvicorn im Hintergrund
    PYTHONUNBUFFERED=1 uvicorn app.main:app \
        --host "${BACKEND_HOST}" \
        --port "${BACKEND_PORT}" \
        --reload \
        >"${LOG_BACKEND}" 2>&1 &

    BACKEND_PID=$!
    echo "${BACKEND_PID}" > /tmp/homewidget.backend.pid
    log_info "Backend PID: ${BACKEND_PID}"

    # Warte bis Health-Check erfolgreich
    log_info "Warte auf Backend Health-Check..."
    local attempt=0
    local max_attempts=30
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s "http://${BACKEND_HOST}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
            log_info "Backend bereit ✓ (http://${BACKEND_HOST}:${BACKEND_PORT})"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "Backend antwortet nicht auf /health nach ${max_attempts}s - Logs: tail -f ${LOG_BACKEND}"
}

################################################################################
# START FRONTEND
################################################################################

start_frontend() {
    log_info ""
    log_info "🚀 FRONTEND STARTEN..."

    cd "${MOBILE_DIR}"

    # Umgebung
    export EXPO_PUBLIC_API_BASE_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"

    # Starte Expo im Hintergrund
    npm run web -- --port "${FRONTEND_PORT}" \
        >"${LOG_FRONTEND}" 2>&1 &

    FRONTEND_PID=$!
    echo "${FRONTEND_PID}" > /tmp/homewidget.frontend.pid
    log_info "Frontend PID: ${FRONTEND_PID}"

    # Warte bis HTTP-Response erfolgreich
    log_info "Warte auf Frontend HTTP-Response..."
    local attempt=0
    local max_attempts=60
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s "http://${FRONTEND_HOST}:${FRONTEND_PORT}" >/dev/null 2>&1; then
            log_info "Frontend bereit ✓ (http://${FRONTEND_HOST}:${FRONTEND_PORT})"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "Frontend antwortet nicht auf HTTP nach ${max_attempts}s - Logs: tail -f ${LOG_FRONTEND}"
}

################################################################################
# CLEANUP
################################################################################

cleanup() {
    log_info ""
    log_info "🧹 CLEANUP..."

    [[ -f /tmp/homewidget.backend.pid ]] && kill $(cat /tmp/homewidget.backend.pid) 2>/dev/null || true
    [[ -f /tmp/homewidget.frontend.pid ]] && kill $(cat /tmp/homewidget.frontend.pid) 2>/dev/null || true

    rm -f /tmp/homewidget.*.pid
    log_info "✓ Beendet"
}

trap cleanup EXIT INT TERM

################################################################################
# MAIN
################################################################################

main() {
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "🚀 HOMEWIDGET LOCAL DEVELOPMENT"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info ""

    check_prereqs
    start_backend
    start_frontend

    log_info ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "✅ BEIDE SERVICES LAUFEN"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info ""
    log_info "🌐 Frontend:    http://${FRONTEND_HOST}:${FRONTEND_PORT}"
    log_info "🔧 Backend:     http://${BACKEND_HOST}:${BACKEND_PORT}"
    log_info "📚 API Docs:    http://${BACKEND_HOST}:${BACKEND_PORT}/docs"
    log_info ""
    log_info "💡 Shortcuts:"
    log_info "   • Ctrl+C zum Beenden"
    log_info "   • Backend-Logs:  tail -f ${LOG_BACKEND}"
    log_info "   • Frontend-Logs: tail -f ${LOG_FRONTEND}"
    log_info ""
    log_info "🧪 E2E-Tests: cd tests/e2e/browseri/playwright && npx playwright test --ui"
    log_info ""

    # Halte bis Signal
    wait
}

main "$@"

