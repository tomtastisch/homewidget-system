#!/usr/bin/env bash
set -Eeuo pipefail

# Lokaler CI-Pipeline-Runner für dieses Projekt.
# Repliziert die wichtigsten Schritte aus .github/workflows/ci.yml:
#  - Backend: setup -> ruff/mypy -> pytest
#  - Mobile: npm ci -> lint -> tsc -> optional build
#
# Nutzung:
#   tools/dev/run_ci_job.sh               # alias für 'all'
#   tools/dev/run_ci_job.sh all           # Backend + Mobile wie in CI
#   tools/dev/run_ci_job.sh backend       # nur Backend (Setup, Quality, Tests)
#   tools/dev/run_ci_job.sh quality       # nur Ruff + MyPy
#   tools/dev/run_ci_job.sh tests|test    # nur Pytest
#   tools/dev/run_ci_job.sh mobile        # nur Mobile (npm ci, lint, tsc, optional build)

log() { echo "[ci-local] $*"; }
err() { echo "[ci-local][ERROR] $*" >&2; }
die() { err "$*"; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
MOBILE_DIR="${PROJECT_ROOT}/mobile"
VENV_DIR="${BACKEND_DIR}/.venv"

TARGET="${1:-all}"

usage() {
  cat <<USAGE
Usage: tools/dev/run_ci_job.sh [all|backend|quality|tests|test|mobile]

Beispiele:
  tools/dev/run_ci_job.sh            # alle Schritte
  tools/dev/run_ci_job.sh backend    # nur Backend (Setup, Quality, Tests)
  tools/dev/run_ci_job.sh tests      # nur Backend-Tests
  tools/dev/run_ci_job.sh mobile     # nur Mobile-Pipeline
USAGE
}

cd "${PROJECT_ROOT}"

ensure_backend_env() {
  if [[ ! -d "${BACKEND_DIR}" ]]; then
    log "Backend-Verzeichnis fehlt – überspringe Backend-Schritte."
    return 1
  fi
  if [[ ! -x "${VENV_DIR}/bin/python" ]]; then
    log "Backend-venv fehlt → führe setup_dev_env.sh aus."
    PYTHON_BIN=python3 bash "${PROJECT_ROOT}/tools/dev/setup_dev_env.sh"
  fi
  # shellcheck disable=SC1091
  source "${VENV_DIR}/bin/activate"
  export PYTHONPATH="${BACKEND_DIR}:${PYTHONPATH:-}"
  log "Backend-venv aktiviert: $(python --version)"
}

run_backend_quality() {
  log "Starte Backend-Quality (ruff + mypy)"
  bash "${PROJECT_ROOT}/tools/dev/quality.sh"
}

run_backend_tests() {
  log "Starte Backend-Tests"
  if [[ -d "${BACKEND_DIR}/tests" ]] || find backend \( -name '*_test.py' -o -name 'test_*.py' \) | grep -q .; then
    pytest backend/tests -v --tb=short
  else
    log "Keine Backend-Tests gefunden – Schritt übersprungen."
  fi
}

run_mobile_pipeline() {
  if [[ ! -d "${MOBILE_DIR}" ]]; then
    log "Mobile-Verzeichnis fehlt – überspringe Mobile-Schritte."
    return 0
  fi

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    # Fallback: Docker verwenden, falls verfügbar, um Node 18 Toolchain ohne Host-Installation zu nutzen
    if command -v docker >/dev/null 2>&1; then
      log "Node/npm nicht im PATH – verwende Docker-Container 'node:18' für Mobile-Schritte."
      docker run --rm \
        -w /app \
        -v "${MOBILE_DIR}:/app" \
        node:18 \
        bash -lc '
          set -Eeuo pipefail
          echo "[ci-local][docker] npm ci"
          npm ci --no-fund --no-audit --silent --loglevel=error --progress=false
          echo "[ci-local][docker] npm run lint"
          npm run lint
          echo "[ci-local][docker] TypeScript Check"
          npx tsc --noEmit
          if node -e "try{process.exit((require(\"./package.json\").scripts||{}).build?0:1)}catch(e){process.exit(1)}"; then
            echo "[ci-local][docker] Build-Script gefunden – npm run build"
            npm run build
          else
            echo "[ci-local][docker] Kein Build-Script definiert – Schritt übersprungen."
          fi
        '
      return 0
    else
      log "Node/npm nicht im PATH – und Docker nicht verfügbar. Mobile-Schritte werden übersprungen."
      return 0
    fi
  fi

  log "Mobile Node: $(node -v), npm: $(npm -v)"
  pushd "${MOBILE_DIR}" >/dev/null

  log "npm ci"
  npm ci --no-fund --no-audit --silent --loglevel=error --progress=false

  log "npm run lint"
  npm run lint

  log "TypeScript Check"
  npx tsc --noEmit

  # Prüfen, ob Build-Script existiert
  if node -e "try{process.exit((require('./package.json').scripts||{}).build?0:1)}catch(e){process.exit(1)}"; then
    log "Build-Script gefunden – npm run build"
    npm run build
  else
    log "Kein Build-Script definiert – Schritt übersprungen."
  fi

  popd >/dev/null
}

run_all() {
  ensure_backend_env || true
  if [[ -d "${BACKEND_DIR}" ]]; then
    run_backend_quality
    run_backend_tests
  fi
  run_mobile_pipeline
  log "Lokale CI-Pipeline abgeschlossen."
}

# Optionaler Fallback: GitLab-Runner, falls .gitlab-ci.yml existiert und
# ein unbekannter TARGET übergeben wurde (z. B. echter Jobname).
maybe_run_gitlab_job() {
  local job_name="$1"
  if [[ -f ".gitlab-ci.yml" ]]; then
    log "Starte GitLab-Runner-Job lokal: Job='${job_name}' (Executor=shell)"
    log "Docker-Image: gitlab/gitlab-runner:v15.11.1"
    docker run --rm \
      --entrypoint bash \
      -w "${PROJECT_ROOT}" \
      -v "${PROJECT_ROOT}:${PROJECT_ROOT}" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      gitlab/gitlab-runner:v15.11.1 \
      -lc "git config --global --add safe.directory '*' && gitlab-runner exec shell '${job_name}'"
  else
    err "Unbekannter Befehl '${job_name}' und keine .gitlab-ci.yml gefunden."
    usage
    exit 1
  fi
}

case "${TARGET}" in
  all|"" )
    run_all
    ;;
  backend )
    ensure_backend_env || true
    if [[ -d "${BACKEND_DIR}" ]]; then
      run_backend_quality
      run_backend_tests
    else
      log "Backend nicht vorhanden – nichts zu tun."
    fi
    ;;
  quality )
    ensure_backend_env || true
    run_backend_quality
    ;;
  tests|test )
    ensure_backend_env
    run_backend_tests
    ;;
  mobile )
    run_mobile_pipeline
    ;;
  * )
    maybe_run_gitlab_job "${TARGET}"
    ;;
esac