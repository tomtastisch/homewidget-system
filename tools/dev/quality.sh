#!/usr/bin/env bash
# Lint & Typecheck Helper für das gesamte Projekt (Backend Python)
# Nutzung:
#   bash tools/dev/quality.sh           # nur prüfen
#   bash tools/dev/quality.sh fix       # auto-fixbare Probleme beheben und prüfen

set -Eeuo pipefail

log() { echo "[quality] $*"; }
die() { echo "[quality][ERROR] $*" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
VENV_DIR="${BACKEND_DIR}/.venv"

MODE="check"
if [[ "${1:-}" == "fix" ]]; then
  MODE="fix"
fi

log "Project root: ${PROJECT_ROOT}"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  die "Backend-Verzeichnis ${BACKEND_DIR} existiert nicht."
fi

# Sicherstellen, dass venv + Tools installiert sind
if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
  log "Backend-venv fehlt → führe setup_dev_env.sh aus."
  PYTHON_BIN=python3.13 bash "${PROJECT_ROOT}/tools/dev/setup_dev_env.sh"
fi

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"

cd "${PROJECT_ROOT}"

if [[ "${MODE}" == "fix" ]]; then
  log "Ruff: auto-fix (imports, simple, pyupgrade, format)"
  # Hinweis: ruff check --fix gibt Exit-Code > 0 zurück, wenn unfixbare Verstöße
  # verbleiben. Das ist während der Fix-Phase akzeptabel, da wir danach nochmal prüfen.
  # Wir erfassen den Exit-Code für Transparenz, stoppen aber nicht den Workflow.
  set +e
  ruff check backend/app --fix
  FIX_EXIT_CODE=$?
  set -e
  if [[ ${FIX_EXIT_CODE} -ne 0 ]]; then
    log "Ruff check --fix beendet mit Exit-Code ${FIX_EXIT_CODE} (unfixbare Verstöße verbleiben möglicherweise)"
  else
    log "Ruff check --fix erfolgreich abgeschlossen"
  fi

  # Optional: Formatter (respektiert [tool.ruff.format])
  set +e
  ruff format backend/app
  FORMAT_EXIT_CODE=$?
  set -e
  if [[ ${FORMAT_EXIT_CODE} -ne 0 ]]; then
    log "Ruff format beendet mit Exit-Code ${FORMAT_EXIT_CODE}"
  else
    log "Ruff format erfolgreich abgeschlossen"
  fi
fi

log "Ruff: check"
set +e
ruff check backend/app --output-format=full
RUFF_EXIT_CODE=$?
set -e
if [[ ${RUFF_EXIT_CODE} -ne 0 ]]; then
  log "Ruff meldet Verstöße (oben), bitte prüfen."
  exit ${RUFF_EXIT_CODE}
fi

log "MyPy: typecheck"
set +e
mypy backend/app
MYPY_EXIT_CODE=$?
set -e
if [[ ${MYPY_EXIT_CODE} -ne 0 ]]; then
  log "MyPy-Typfehler (oben), bitte iterativ beheben."
  exit ${MYPY_EXIT_CODE}
fi

log "Quality-Run abgeschlossen (Mode=${MODE})."
