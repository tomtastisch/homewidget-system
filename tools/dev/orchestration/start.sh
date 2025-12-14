#!/usr/bin/env bash

################################################################################
# ROBUST START - Backend + Frontend
#
# Zentrale Orchestrierungs-Datei für das Starten des kompletten Systems
# Nutzt gemeinsame Funktionen aus lib/ um Redundanzen zu vermeiden
################################################################################

set -Eeuo pipefail

# Lade gemeinsame Funktionen
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/../lib/logging.sh"
source "${SCRIPT_DIR}/../lib/checks.sh"
source "${SCRIPT_DIR}/../lib/services.sh"

# Konfiguration
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." &>/dev/null && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
MOBILE_DIR="${PROJECT_ROOT}/mobile"

BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-19006}"
FRONTEND_HOST="${FRONTEND_HOST:-localhost}"

# Cleanup bei Signal
cleanup() {
    log_info "Cleanup..."
    stop_service "backend"
    stop_service "frontend"
}

trap cleanup EXIT INT TERM

################################################################################
# MAIN
################################################################################

main() {
    log_info "════════════════════════════════════════════════════════════════"
    log_info "🚀 HOMEWIDGET ROBUST START"
    log_info "════════════════════════════════════════════════════════════════"
    log_info "Projekt: ${PROJECT_ROOT}"
    log_info ""

    # Prerequisite-Checks
    check_prerequisites || exit 1
    check_port_free "${BACKEND_PORT}" || exit 1
    check_port_free "${FRONTEND_PORT}" || exit 1
    check_directory_exists "${BACKEND_DIR}/.venv" "Backend venv" || exit 1
    check_directory_exists "${MOBILE_DIR}/node_modules" "Frontend node_modules" || exit 1

    log_info ""

    # Starte Services
    start_service \
        "backend" \
        "source .venv/bin/activate && uvicorn app.main:app --host ${BACKEND_HOST} --port ${BACKEND_PORT} --reload" \
        "${BACKEND_DIR}" \
        "/tmp/backend.log"

    sleep 2

    wait_for_http "http://${BACKEND_HOST}:${BACKEND_PORT}/health" 30 || exit 1

    start_service \
        "frontend" \
        "EXPO_PUBLIC_API_BASE_URL=http://${BACKEND_HOST}:${BACKEND_PORT} npm run web -- --port ${FRONTEND_PORT}" \
        "${MOBILE_DIR}" \
        "/tmp/frontend.log"

    wait_for_http "http://${FRONTEND_HOST}:${FRONTEND_PORT}" 60 || exit 1

    log_info ""
    log_info "════════════════════════════════════════════════════════════════"
    log_success "✅ BEIDE SERVICES LAUFEN"
    log_info "════════════════════════════════════════════════════════════════"
    log_info ""
    log_info "🌐 Frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
    log_info "🔧 Backend:  http://${BACKEND_HOST}:${BACKEND_PORT}"
    log_info "📚 API Docs: http://${BACKEND_HOST}:${BACKEND_PORT}/docs"
    log_info ""
    log_info "💡 Tipps:"
    log_info "   - Ctrl+C zum Beenden"
    log_info "   - tail -f /tmp/backend.log"
    log_info "   - tail -f /tmp/frontend.log"
    log_info ""

    # Halte am Leben
    wait
}

main "$@"

