#!/usr/bin/env bash
# UI-Release TODO-Mapping Generator
#
# Generiert eine strukturierte Liste aller BLOCKED-UI Skips mit zugehörigen TODOs.
# Nützlich für die Planung des TODO-Abbaus nach Merge von Ticket C (UI-Signale).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SPECS_DIR="${PROJECT_ROOT}/tests/e2e/browseri/playwright/specs"

# Farben für Terminal-Output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "   UI-Release TODO-Mapping"
echo "=========================================="
echo ""
echo "Zweck: Mapping von BLOCKED-UI Skips zu zugehörigen TODOs"
echo "Nutzung: Planung für TODO-Abbau nach Ticket C (UI-Signale)"
echo ""

# Prüfe ob Specs-Verzeichnis existiert
if [[ ! -d "${SPECS_DIR}" ]]; then
    echo -e "${RED}ERROR: Specs-Verzeichnis nicht gefunden: ${SPECS_DIR}${NC}"
    exit 1
fi

# Zähle Skips
skip_count=$(grep -r "test.skip.*BLOCKED-UI" "${SPECS_DIR}" --include="*.spec.ts" | wc -l)
echo -e "${BLUE}Gesamt BLOCKED-UI Skips:${NC} ${skip_count}"
echo ""

if [[ ${skip_count} -eq 0 ]]; then
    echo -e "${GREEN}✅ Keine BLOCKED-UI Skips gefunden!${NC}"
    echo -e "${GREEN}   Alle UI-Features sind implementiert.${NC}"
    echo ""
    exit 0
fi

echo "=========================================="
echo "   Skip → TODO Mapping"
echo "=========================================="
echo ""

# Finde alle Skips und zugehörige TODOs
skip_counter=0

while IFS= read -r skip_line; do
    skip_counter=$((skip_counter + 1))
    
    # Parse Skip-Line
    file=$(echo "${skip_line}" | cut -d: -f1)
    line=$(echo "${skip_line}" | cut -d: -f2)
    skip_content=$(echo "${skip_line}" | cut -d: -f3-)
    
    # Extrahiere Test-ID aus dem Kommentar (falls vorhanden)
    test_id=$(grep -A2 "^${line}:" "${file}" 2>/dev/null | grep -oP "@\w+ \K[A-Z]+-[0-9]+" | head -1 || echo "N/A")
    
    # Extrahiere Skip-Grund
    skip_reason=$(echo "${skip_content}" | grep -oP "BLOCKED-UI: \K[^.]+\." | head -c 60)
    
    # Extrahiere Exit-Kriterium
    exit_criterion=$(echo "${skip_content}" | grep -oP "Entfernen sobald \K[^.]+\." | head -c 60)
    
    file_short=$(basename "${file}")
    
    echo -e "${BLUE}[${skip_counter}/${skip_count}] ${file_short}:${line}${NC}"
    echo "  Test-ID: ${test_id}"
    echo "  Grund:   ${skip_reason}"
    echo "  Exit:    ${exit_criterion}"
    
    # Suche TODOs in der Nähe des Skips (±30 Zeilen)
    start_line=$((line > 10 ? line - 10 : 1))
    end_line=$((line + 40))
    
    # Extrahiere Testfunktion (um relevante TODOs zu finden)
    test_function=$(sed -n "${line}p" "${file}" | grep -oP "test\(['\"]@\w+ [^'\"]+['\"]" || echo "")
    
    # Finde TODOs in diesem Testblock
    todos=$(sed -n "${start_line},${end_line}p" "${file}" | grep -n "// TODO" || true)
    
    if [[ -n "${todos}" ]]; then
        echo -e "  ${GREEN}TODOs gefunden:${NC}"
        echo "${todos}" | while IFS= read -r todo_line; do
            todo_line_num=$(echo "${todo_line}" | cut -d: -f1)
            todo_content=$(echo "${todo_line}" | cut -d: -f2-)
            actual_line=$((start_line + todo_line_num - 1))
            
            # Verkürze TODO-Text
            todo_short=$(echo "${todo_content}" | head -c 80)
            
            echo "    [$actual_line] ${todo_short}"
            
            # Prüfe, ob TODO eine Issue-Referenz hat
            if echo "${todo_content}" | grep -q "TODO("; then
                issue_id=$(echo "${todo_content}" | grep -oP "TODO\(\K[^)]+")
                echo -e "        ${GREEN}✓${NC} Issue: ${issue_id}"
            else
                echo -e "        ${YELLOW}⚠${NC} Keine Issue-Referenz (nicht policy-konform)"
            fi
        done
    else
        echo -e "  ${YELLOW}⚠ Keine TODOs gefunden (prüfe manuell)${NC}"
    fi
    
    # Suche nach kommentierten Assertions (// await expect...)
    assertions=$(sed -n "${start_line},${end_line}p" "${file}" | grep -n "// await expect" || true)
    
    if [[ -n "${assertions}" ]]; then
        echo -e "  ${BLUE}Kommentierte Assertions:${NC}"
        echo "${assertions}" | while IFS= read -r assertion_line; do
            assertion_line_num=$(echo "${assertion_line}" | cut -d: -f1)
            assertion_content=$(echo "${assertion_line}" | cut -d: -f2-)
            actual_line=$((start_line + assertion_line_num - 1))
            
            # Verkürze Assertion
            assertion_short=$(echo "${assertion_content}" | head -c 80)
            
            echo "    [$actual_line] ${assertion_short}"
        done
    fi
    
    echo ""
done < <(grep -rn "test.skip.*BLOCKED-UI" "${SPECS_DIR}" --include="*.spec.ts")

# Zusammenfassung nach Test-Level
echo "=========================================="
echo "   Zusammenfassung nach Test-Level"
echo "=========================================="
echo ""

# Zähle nach Test-Level
minimum_count=$(grep -r "test.skip.*BLOCKED-UI" "${SPECS_DIR}" --include="*.spec.ts" -B2 | grep -c "@minimum" || true)
standard_count=$(grep -r "test.skip.*BLOCKED-UI" "${SPECS_DIR}" --include="*.spec.ts" -B2 | grep -c "@standard" || true)
advanced_count=$(grep -r "test.skip.*BLOCKED-UI" "${SPECS_DIR}" --include="*.spec.ts" -B2 | grep -c "@advanced" || true)

echo "Minimum-Tests:  ${minimum_count} Skips"
echo "Standard-Tests: ${standard_count} Skips"
echo "Advanced-Tests: ${advanced_count} Skips"
echo ""

# Prioritäts-Empfehlung
echo "=========================================="
echo "   Empfohlene Reihenfolge"
echo "=========================================="
echo ""
echo "1. Core-Standard (Prio 1): ${standard_count} Tests"
echo "   - FEED-*, WIDGET-*, AUTH-*, INFRA-02/03/05"
echo ""
echo "2. Core-Advanced (Prio 2): ${advanced_count} Tests"
echo "   - ROLE-*, INFRA-06/07/08, BROWSER-*"
echo ""
echo "3. Minimum (bereits grün): ${minimum_count} Skips (sollten 0 sein)"
if [[ ${minimum_count} -gt 0 ]]; then
    echo -e "   ${YELLOW}⚠ WARNUNG: Minimum-Tests sollten nicht geskippt sein!${NC}"
fi
echo ""

# Generiere Aktionsplan
echo "=========================================="
echo "   Aktionsplan nach Ticket C"
echo "=========================================="
echo ""
echo "Nach Merge von Ticket C (UI-Signale):"
echo ""
echo "1. Branch erstellen:"
echo "   git checkout -b feature/remove-blocked-ui-skips"
echo ""
echo "2. Für jeden Skip oben:"
echo "   - Skip-Zeile entfernen"
echo "   - TODO-Assertions aktivieren"
echo "   - testIds anpassen (falls nötig)"
echo "   - Test lokal ausführen"
echo ""
echo "3. Validierung:"
echo "   npx playwright test --project=standard  # Core-Standard"
echo "   npx playwright test --project=advanced  # Core-Advanced"
echo ""
echo "4. Quality Gates:"
echo "   - TODO-Count: 0 in Core-Standard"
echo "   - Skip-Count: 0 (gesamt)"
echo "   - Alle Tests grün"
echo ""
echo "5. PR erstellen + Review"
echo ""
echo "Details: siehe UI_RELEASE_CHECKLIST.md"
echo ""

# Export als JSON (optional, für CI-Integration)
if [[ "${1:-}" == "--json" ]]; then
    echo "=========================================="
    echo "   JSON-Export"
    echo "=========================================="
    echo ""
    
    json_output="${PROJECT_ROOT}/test-results/ui-release-mapping.json"
    mkdir -p "$(dirname "${json_output}")"
    
    echo "{" > "${json_output}"
    echo "  \"skip_count\": ${skip_count}," >> "${json_output}"
    echo "  \"minimum_skips\": ${minimum_count}," >> "${json_output}"
    echo "  \"standard_skips\": ${standard_count}," >> "${json_output}"
    echo "  \"advanced_skips\": ${advanced_count}," >> "${json_output}"
    echo "  \"skips\": [" >> "${json_output}"
    
    # TODO: Detailliertes JSON-Mapping hier einfügen (für CI-Automation)
    
    echo "  ]" >> "${json_output}"
    echo "}" >> "${json_output}"
    
    echo "JSON exportiert nach: ${json_output}"
fi

echo "Mapping abgeschlossen."
