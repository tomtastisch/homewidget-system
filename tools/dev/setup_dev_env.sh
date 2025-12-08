#!/usr/bin/env bash
# Zentrale Dev-Umgebung für Backend (Python 3.13) und Mobile (Node/Expo)
# Idempotent, für Host und Devcontainer nutzbar.

set -Eeuo pipefail

log()  { echo "[setup] $*"; }
err()  { echo "[setup][ERROR] $*" >&2; }
die()  { err "$*"; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"

BACKEND_DIR="${PROJECT_ROOT}/backend"
MOBILE_DIR="${PROJECT_ROOT}/mobile"

log "Projektwurzel: ${PROJECT_ROOT}"

# ---------------------------------------------------------------------------
# Backend (Python ≥ 3.13, venv + editable Install)
# ---------------------------------------------------------------------------
setup_backend() {
  if [[ ! -d "${BACKEND_DIR}" ]]; then
    log "[Backend] Übersprungen: ${BACKEND_DIR} existiert nicht."
    return 0
  fi

  local python_bin="${PYTHON_BIN:-python3}"
  local venv_dir="${BACKEND_DIR}/.venv"

  if ! command -v "${python_bin}" >/dev/null 2>&1; then
    die "[Backend] Basis-Python '${python_bin}' nicht im PATH gefunden. Bitte Python 3.12+ installieren."
  fi

  log "[Backend] Projektverzeichnis: ${BACKEND_DIR}"
  log "[Backend] Basis-Python: ${python_bin}"

  if [[ ! -d "${venv_dir}" ]]; then
    log "[Backend] Erzeuge venv in ${venv_dir}"
    "${python_bin}" -m venv "${venv_dir}" || die "[Backend] venv-Erzeugung fehlgeschlagen."
  else
    log "[Backend] Verwende vorhandene venv in ${venv_dir}"
  fi

  # venv aktivieren
  # shellcheck disable=SC1091
  source "${venv_dir}/bin/activate"

  local venv_python
  venv_python="$(python -c 'import sys,os; print(os.path.realpath(sys.executable))')"
  log "[Backend] venv-Python: ${venv_python} ($(python --version))"

  # Pip-Grundsetup
  python -m pip install --upgrade pip setuptools wheel

  # Editable-Install über pyproject.toml
  if [[ -f "${BACKEND_DIR}/pyproject.toml" ]]; then
    log "[Backend] Installiere Backend (editable) inkl. Dev-Extras"
    set +e
    (cd "${BACKEND_DIR}" && python -m pip install -e .[dev])
    rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
      log "[Backend] Dev-Extras nicht installierbar → fallback auf '-e .'"
      (cd "${BACKEND_DIR}" && python -m pip install -e .)
    fi
  elif [[ -f "${BACKEND_DIR}/requirements.txt" ]]; then
    log "[Backend] Installiere requirements.txt"
    python -m pip install -r "${BACKEND_DIR}/requirements.txt"
  else
    log "[Backend] Keine Dependency-Definition gefunden (pyproject/requirements)."
  fi

  # Smoke-Tests: Kernlibs und Paket-Import (app)
  python - <<'PY'
from fastapi import FastAPI  # noqa: F401
from sqlmodel import SQLModel  # noqa: F401
from pydantic import EmailStr  # noqa: F401
print("Backend-Imports OK.")
PY

  # Sicherstellen, dass das Projektpaket importierbar ist (Paket-Layout/PYTHONPATH)
  python - <<'PY'
import importlib, sys
mod = importlib.import_module("app")
print("Import app OK:", getattr(mod, "__file__", None))
PY

  log "[Backend] Backend-Environment OK."
  deactivate || true
}

# ---------------------------------------------------------------------------
# Mobile (Node/Expo, npm install)
# ---------------------------------------------------------------------------
setup_mobile() {
  if [[ ! -d "${MOBILE_DIR}" ]]; then
    log "[Mobile] Übersprungen: ${MOBILE_DIR} existiert nicht."
    return 0
  fi

  log "[Mobile] Projektverzeichnis: ${MOBILE_DIR}"

  # Optional: nvm initialisieren und Node 18 verwenden, wenn verfügbar
  # Dies stellt sicher, dass lokal wie im Devcontainer Node 18 genutzt wird.
  local want_node_major="18"
  local nvm_inited=0
  if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh" && nvm_inited=1 || true
  elif [[ -s "/usr/local/share/nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "/usr/local/share/nvm/nvm.sh" && nvm_inited=1 || true
  elif [[ -s "/usr/local/nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    . "/usr/local/nvm/nvm.sh" && nvm_inited=1 || true
  elif [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "${HOME}/.nvm/nvm.sh" && nvm_inited=1 || true
  fi

  if [[ ${nvm_inited} -eq 1 ]]; then
    log "[Mobile] nvm gefunden – setze Node ${want_node_major}"
    # Installiere die gewünschte Major-Version, falls nicht vorhanden; nutze sie dann.
    nvm install ${want_node_major}
    nvm use ${want_node_major}
  else
    log "[Mobile] nvm nicht verfügbar – verwende systemweiten Node."
  fi

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    log "[Mobile] Node/npm nicht im PATH (auf Host ok; im Devcontainer MUSS Node-Feature aktiv sein)."
    return 0
  fi

  log "[Mobile] Node: $(node -v), npm: $(npm -v)"

  pushd "${MOBILE_DIR}" >/dev/null

  # Lockfile aktuell halten → bewusst npm install, nicht npm ci,
  # damit Versionsfixes (@types/react-native etc.) sauber übernommen werden.
  log "[Mobile] npm install (aktualisiert package-lock.json)"
  npm install --no-fund --no-audit

  log "[Mobile] Mobile-Environment OK (Dependencies installiert)."
  popd >/dev/null
}

main() {
  setup_backend
  setup_mobile
  log "Setup abgeschlossen."
}

main "$@"