#!/bin/sh
# Lädt alle Artefakte des letzten Runs herunter

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

DEST_DIR=".artifacts/ci/$RUN_ID"
mkdir -p "$DEST_DIR"

echo "Downloading artifacts for run $RUN_ID into $DEST_DIR..."
gh run download "$RUN_ID" --dir "$DEST_DIR"

echo "Artifacts downloaded to: $DEST_DIR"
ls -R "$DEST_DIR"
