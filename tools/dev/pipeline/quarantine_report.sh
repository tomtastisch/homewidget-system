#!/usr/bin/env bash
# CI-Script zur Anzeige der quarantänisierten (UI-blockierten) Tests
#
# Dieses Script gibt eine Zusammenfassung aller BLOCKED-UI Skips aus,
# die in den Playwright-Tests vorhanden sind.

set -euo pipefail

PLAYWRIGHT_SPECS_DIR="tests/e2e/browseri/playwright/specs"

echo "=========================================="
echo "Playwright Test Quarantine Report"
echo "=========================================="
echo ""

# Zähle BLOCKED-UI Skips
TOTAL_BLOCKED=$(grep -r "BLOCKED-UI" "${PLAYWRIGHT_SPECS_DIR}"/*.spec.ts | wc -l)

echo "Anzahl UI-blockierter Tests (BLOCKED-UI): ${TOTAL_BLOCKED}"
echo ""

# Zeige Details pro Datei
echo "Details nach Test-Suite:"
echo "----------------------------------------"
for spec_file in "${PLAYWRIGHT_SPECS_DIR}"/*.spec.ts; do
    filename=$(basename "$spec_file")
    if grep -q "BLOCKED-UI" "$spec_file" 2>/dev/null; then
        count=$(grep "BLOCKED-UI" "$spec_file" | wc -l)
        echo "  ${filename}: ${count} Test(s)"
    fi
done
echo ""

# Zeige alle Skip-Gründe
echo "Skip-Gründe (UI-Features):"
echo "----------------------------------------"
grep -h "BLOCKED-UI" "${PLAYWRIGHT_SPECS_DIR}"/*.spec.ts | \
    sed 's/.*BLOCKED-UI: /  - /' | \
    sed 's/\. Entfernen.*//' | \
    sort -u
echo ""

echo "=========================================="
echo "Hinweis: Diese Tests werden in CI übersprungen,"
echo "laufen aber lokal weiter (wenn CI env nicht gesetzt)."
echo "=========================================="
