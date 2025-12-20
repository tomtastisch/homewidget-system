#!/bin/sh
# Zeigt Status des letzten Workflow-Runs für die aktuelle Branch

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  exit 1
fi

BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  echo "Error: Could not determine current branch."
  exit 1
fi

echo "Last run for branch: $BRANCH"
# gh run list --branch "$BRANCH" --limit 1 --json status,conclusion,url,databaseId
# Da wir kein jq nutzen wollen, nutzen wir die Standardausgabe von gh run list und gh run view

# Extrahiere Run ID
RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId -q ".[0].databaseId" 2>/dev/null)

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No runs found for branch $BRANCH."
  exit 0
fi

gh run list --branch "$BRANCH" --limit 1
echo ""
echo "Details for Run $RUN_ID:"
gh run view "$RUN_ID"
