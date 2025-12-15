#!/usr/bin/env bash
set -euo pipefail

# Startet das Backend im E2E-Testmodus auf 127.0.0.1:8100
# Idempotent: Schema/Seeds werden bei jedem Start neu initialisiert.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/.."

export ENV="test"
# Erzwinge eine schreibbare DB in /tmp für E2E/CI
export E2E_DATABASE_URL=${E2E_DATABASE_URL:-"sqlite:////tmp/homewidget-e2e.db"}
export DATABASE_URL="${E2E_DATABASE_URL}"
export REQUEST_LOGGING_ENABLED=${REQUEST_LOGGING_ENABLED:-"0"}

cd "$BACKEND_DIR"

# Alte E2E-DB entfernen, um Readonly/Lock-Probleme zu vermeiden
if [[ "${DATABASE_URL}" == sqlite:////tmp/* ]]; then
  DB_PATH="/tmp/$(basename "${DATABASE_URL#sqlite:////}")"
  rm -f "${DB_PATH}" || true
fi

# Diagnoseausgabe
echo "[e2e-backend] ENV=${ENV}"
echo "[e2e-backend] DATABASE_URL=${DATABASE_URL}"

python - <<'PY'
from app.config.test_e2e import apply_env
apply_env()
from app.initial_data_e2e import run as seed
seed()
print("e2e_seed_complete")
PY

exec uvicorn app.main:app --host 127.0.0.1 --port 8100 --log-level info
