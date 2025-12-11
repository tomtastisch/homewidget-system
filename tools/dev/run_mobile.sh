#!/usr/bin/env bash
# Startet das Expo-Frontend. Nutzt dieselbe Logik wie die CI-Pipeline,
# um Abhängigkeiten zu installieren (keine Code-Duplizierung).

set -Eeuo pipefail

log() { echo "[mobile] $*"; }
die() { echo "[mobile][ERROR] $*" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
CI_STEPS="${PROJECT_ROOT}/tools/dev/pipeline/ci_steps.sh"
MOBILE_DIR="${PROJECT_ROOT}/mobile"

log "Project root: ${PROJECT_ROOT}"
log "Mobile dir:   ${MOBILE_DIR}"

if [[ ! -d "${MOBILE_DIR}" ]]; then
  die "Mobile-Verzeichnis ${MOBILE_DIR} existiert nicht."
fi

if [[ ! -x "${CI_STEPS}" ]]; then
  die "ci_steps.sh nicht gefunden unter ${CI_STEPS}"
fi

# 1) Dependencies identisch zur Pipeline installieren
bash "${CI_STEPS}" mobile_install_deps

# 2) Optional: schnelle Checks wie in der Pipeline (entwicklerfreundlich)
if [[ "${RUN_CHECKS:-1}" == "1" ]]; then
  bash "${CI_STEPS}" mobile_lint || true
  bash "${CI_STEPS}" mobile_typescript_check || true
fi

cd "${MOBILE_DIR}"

if ! command -v npx >/dev/null 2>&1; then
  die "npx nicht verfügbar (npm zu alt oder nicht korrekt installiert)."
fi

log "Starte Expo (tunnel)…"
exec npx expo start --tunnel