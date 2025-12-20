#!/bin/sh
# Wartet bis der letzte Workflow-Run der aktuellen Branch beendet ist

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

echo "Watching run $RUN_ID..."
gh run watch "$RUN_ID" --compact --exit-status
