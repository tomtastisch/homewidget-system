#!/usr/bin/env bash
# TODO-Report für Playwright E2E Tests
#
# Zeigt alle TODOs in Test-Spezifikationen mit Issue-Referenzen an.
# Gruppiert nach Kategorien und prüft auf Policy-Konformität.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SPECS_DIR="${PROJECT_ROOT}/tests/e2e/browseri/playwright/specs"

# Farben für Terminal-Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "==================================="
echo "   Playwright E2E TODO-Report"
echo "==================================="
echo ""

# Prüfe ob Specs-Verzeichnis existiert
if [[ ! -d "${SPECS_DIR}" ]]; then
    echo -e "${RED}ERROR: Specs-Verzeichnis nicht gefunden: ${SPECS_DIR}${NC}"
    exit 1
fi

# Zähle TODOs
total_todos=$(grep -r "TODO" "${SPECS_DIR}" --include="*.spec.ts" | wc -l)
policy_compliant=$(grep -r "TODO(" "${SPECS_DIR}" --include="*.spec.ts" | wc -l || true)
non_compliant=$((total_todos - policy_compliant))

echo -e "${BLUE}Gesamt-TODOs:${NC} ${total_todos}"
echo -e "${GREEN}Policy-konform (mit Issue-ID):${NC} ${policy_compliant}"
if [[ ${non_compliant} -gt 0 ]]; then
    echo -e "${RED}Nicht policy-konform (ohne Issue-ID):${NC} ${non_compliant}"
else
    echo -e "${GREEN}Alle TODOs sind policy-konform!${NC}"
fi
echo ""

# Zeige nicht-konforme TODOs (falls vorhanden)
if [[ ${non_compliant} -gt 0 ]]; then
    echo -e "${YELLOW}=== WARNUNG: Nicht-konforme TODOs ===${NC}"
    echo ""
    grep -rn "TODO:" "${SPECS_DIR}" --include="*.spec.ts" | grep -v "TODO(" || true
    echo ""
    echo -e "${YELLOW}Diese TODOs müssen aktualisiert werden gemäß TODO_POLICY.md${NC}"
    echo ""
fi

# Gruppiere TODOs nach Kategorie (basierend auf Issue-Prefix)
echo "==================================="
echo "   TODOs nach Kategorie"
echo "==================================="
echo ""

# Frontend-blockierte TODOs
frontend_count=$(grep -r "TODO(FRONTEND" "${SPECS_DIR}" --include="*.spec.ts" | wc -l || true)
if [[ ${frontend_count} -gt 0 ]]; then
    echo -e "${BLUE}Frontend-Features (${frontend_count}):${NC}"
    grep -rn "TODO(FRONTEND" "${SPECS_DIR}" --include="*.spec.ts" | while IFS=: read -r file line content; do
        file_short=$(basename "${file}")
        echo "  - ${file_short}:${line}"
        # Extrahiere Issue-ID und Beschreibung
        issue_id=$(echo "${content}" | grep -oP 'TODO\(\K[^)]+' || echo "N/A")
        description=$(echo "${content}" | sed 's/.*TODO([^)]*): //' | cut -c 1-80)
        echo "    ${issue_id}: ${description}"
    done
    echo ""
fi

# Backend-blockierte TODOs
backend_count=$(grep -r "TODO(BACKEND" "${SPECS_DIR}" --include="*.spec.ts" | wc -l || true)
if [[ ${backend_count} -gt 0 ]]; then
    echo -e "${BLUE}Backend-Features (${backend_count}):${NC}"
    grep -rn "TODO(BACKEND" "${SPECS_DIR}" --include="*.spec.ts" | while IFS=: read -r file line content; do
        file_short=$(basename "${file}")
        echo "  - ${file_short}:${line}"
        issue_id=$(echo "${content}" | grep -oP 'TODO\(\K[^)]+' || echo "N/A")
        description=$(echo "${content}" | sed 's/.*TODO([^)]*): //' | cut -c 1-80)
        echo "    ${issue_id}: ${description}"
    done
    echo ""
fi

# Test-Infra TODOs
infra_count=$(grep -r "TODO(TEST-INFRA\|TODO(INFRA" "${SPECS_DIR}" --include="*.spec.ts" | wc -l || true)
if [[ ${infra_count} -gt 0 ]]; then
    echo -e "${BLUE}Test-Infrastruktur (${infra_count}):${NC}"
    grep -rn "TODO(TEST-INFRA\|TODO(INFRA" "${SPECS_DIR}" --include="*.spec.ts" | while IFS=: read -r file line content; do
        file_short=$(basename "${file}")
        echo "  - ${file_short}:${line}"
        issue_id=$(echo "${content}" | grep -oP 'TODO\(\K[^)]+' || echo "N/A")
        description=$(echo "${content}" | sed 's/.*TODO([^)]*): //' | cut -c 1-80)
        echo "    ${issue_id}: ${description}"
    done
    echo ""
fi

# Allgemeine TODOs (ohne spezifisches Prefix)
other_count=$(grep -r "TODO(" "${SPECS_DIR}" --include="*.spec.ts" | grep -v "TODO(FRONTEND\|TODO(BACKEND\|TODO(TEST-INFRA\|TODO(INFRA" | wc -l || true)
if [[ ${other_count} -gt 0 ]]; then
    echo -e "${BLUE}Sonstige (${other_count}):${NC}"
    grep -rn "TODO(" "${SPECS_DIR}" --include="*.spec.ts" | grep -v "TODO(FRONTEND\|TODO(BACKEND\|TODO(TEST-INFRA\|TODO(INFRA" | while IFS=: read -r file line content; do
        file_short=$(basename "${file}")
        echo "  - ${file_short}:${line}"
        issue_id=$(echo "${content}" | grep -oP 'TODO\(\K[^)]+' || echo "N/A")
        description=$(echo "${content}" | sed 's/.*TODO([^)]*): //' | cut -c 1-80)
        echo "    ${issue_id}: ${description}"
    done
    echo ""
fi

# Zusammenfassung
echo "==================================="
echo "   Zusammenfassung"
echo "==================================="
echo ""
echo "Frontend-blockiert: ${frontend_count}"
echo "Backend-blockiert:  ${backend_count}"
echo "Test-Infra:         ${infra_count}"
echo "Sonstige:           ${other_count}"
echo ""
echo -e "${GREEN}Gesamt policy-konforme TODOs: ${policy_compliant}${NC}"

# Exit-Code basierend auf nicht-konformen TODOs
if [[ ${non_compliant} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}HINWEIS: ${non_compliant} TODOs sind nicht policy-konform.${NC}"
    echo -e "${YELLOW}Bitte aktualisiere sie gemäß TODO_POLICY.md${NC}"
    # Kein Exit 1, da dies keine harten Fehler sind (nur Warnings)
fi

echo ""
echo "Report abgeschlossen."
