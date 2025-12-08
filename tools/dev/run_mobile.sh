#!/usr/bin/env bash
# Startet das Expo-Frontend. Stellt sicher, dass Dependencies vorhanden sind.

set -Eeuo pipefail

log() { echo "[mobile] $*"; }
die() { echo "[mobile][ERROR] $*" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../.." &>/dev/null && pwd)"
MOBILE_DIR="${PROJECT_ROOT}/mobile"

log "Project root: ${PROJECT_ROOT}"
log "Mobile dir:   ${MOBILE_DIR}"

if [[ ! -d "${MOBILE_DIR}" ]]; then
  die "Mobile-Verzeichnis ${MOBILE_DIR} existiert nicht."
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  die "Node/npm nicht im PATH (bist du im Devcontainer?)."
fi

log "Node: $(node -v)"
log "npm:  $(npm -v)"

cd "${MOBILE_DIR}"

if [[ ! -d node_modules ]]; then
  log "node_modules fehlt → npm install"
  npm install --no-fund --no-audit
fi

if ! command -v npx >/dev/null 2>&1; then
  die "npx nicht verfügbar (npm zu alt oder nicht korrekt installiert)."
fi

log "Starte Expo (tunnel)…"
exec npx expo start --tunnel