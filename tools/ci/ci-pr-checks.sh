#!/bin/sh
# Zeigt Checks für den PR der aktuellen Branch oder eine übergebene PR-URL

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run 'gh auth login'."
  exit 1
fi

PR_TARGET=${1:-""}

if [ -z "$PR_TARGET" ]; then
  echo "Fetching checks for current branch..."
  gh pr checks
else
  echo "Fetching checks for $PR_TARGET..."
  gh pr checks "$PR_TARGET"
fi
