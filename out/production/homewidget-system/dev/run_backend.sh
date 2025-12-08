#!/usr/bin/env bash
# Startet das FastAPI-Backend (uvicorn) mit der Backend-venv.

set -Eeuo pipefail

log() { echo "[backend] $*"; }
die() { echo "[backend][ERROR] $*" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
VENV_DIR="${BACKEND_DIR}/.venv"

# Konfigurierbarer Host/Port (Defaults wie bisher)
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
BACKEND_FORCE_KILL="${BACKEND_FORCE_KILL:-0}"

log "Project root: ${PROJECT_ROOT}"
log "Backend dir:  ${BACKEND_DIR}"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  die "Backend-Verzeichnis ${BACKEND_DIR} existiert nicht."
fi

if [[ ! -d "${VENV_DIR}" ]]; then
  log "Keine venv gefunden → führe setup_dev_env.sh aus."
  PYTHON_BIN=python3.13 bash "${PROJECT_ROOT}/tools/dev/setup_dev_env.sh"
fi

if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  die "Backend-venv scheint defekt (${VENV_DIR}/bin/python fehlt)."
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"

cd "${BACKEND_DIR}"

# Prüfe, ob Port bereits belegt ist, um EADDRINUSE vorab abzufangen
port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${BACKEND_PORT}" -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | grep -q "."
  else
    # Fallback: versuche mit nc zu prüfen
    if command -v nc >/dev/null 2>&1; then
      nc -z localhost "${BACKEND_PORT}" >/dev/null 2>&1
      return $?
    fi
    return 1
  fi
}

if port_in_use; then
  if [[ "${BACKEND_FORCE_KILL}" == "1" ]] && command -v lsof >/dev/null 2>&1; then
    log "Port ${BACKEND_PORT} ist belegt → versuche Prozess zu beenden (BACKEND_FORCE_KILL=1)."
    PIDS=$(lsof -iTCP:"${BACKEND_PORT}" -sTCP:LISTEN -n -P | awk 'NR>1 {print $2}' | sort -u)
    if [[ -n "${PIDS}" ]]; then
      for pid in ${PIDS}; do
        kill "${pid}" 2>/dev/null || true
      done
      sleep 0.5
      # Hartes Kill, falls noch da
      for pid in ${PIDS}; do
        if kill -0 "${pid}" 2>/dev/null; then
          kill -9 "${pid}" 2>/dev/null || true
        fi
      done
    fi
    # kurze Re-Check
    if port_in_use; then
      die "Port ${BACKEND_PORT} weiterhin belegt. Bitte manuell prüfen (lsof -iTCP:${BACKEND_PORT} -sTCP:LISTEN)."
    fi
  else
    log "Hinweis: Du kannst einen alternativen Port setzen, z. B.: BACKEND_PORT=8001 bash tools/dev/run_backend.sh"
    log "Oder den belegenden Prozess anzeigen: lsof -iTCP:${BACKEND_PORT} -sTCP:LISTEN -n -P"
    die "Port ${BACKEND_PORT} ist bereits belegt. Beende den Prozess oder starte mit anderem Port (BACKEND_PORT)."
  fi
fi

log "Starte uvicorn auf http://${BACKEND_HOST}:${BACKEND_PORT} …"
exec uvicorn app.main:app --host "${BACKEND_HOST}" --port "${BACKEND_PORT}" --reload