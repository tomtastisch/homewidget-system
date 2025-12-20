#!/bin/sh
# Holt Logs der fehlgeschlagenen Schritte des letzten Runs in eine Datei

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  exit 1
fi

BRANCH=$(git branch --show-current)
RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q ".[0].databaseId" 2>/dev/null)

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No runs found for branch $BRANCH."
  exit 1
fi

LOG_DIR=".artifacts/ci"
LOG_FILE="$LOG_DIR/last_failed.log"

mkdir -p "$LOG_DIR"

echo "Fetching failed logs for run $RUN_ID..."
gh run view "$RUN_ID" --log-failed > "$LOG_FILE"

echo "Log file: $LOG_FILE"
gh run view "$RUN_ID" --web --exit-status || echo "Run URL: $(gh run view "$RUN_ID" --json url -q .url 2>/dev/null || echo 'Check gh run view')"
