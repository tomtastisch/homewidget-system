#!/usr/bin/env bash
# TODO-Report für Playwright E2E Tests
#
# - Listet alle TODOs in Playwright-Specs auf
# - Prüft TODO-Policy: TODO(<ISSUE-ID>): <Beschreibung>
# - Gruppiert nach Kategorie (FRONTEND / BACKEND / INFRA / Sonstige)
# - Erzwingt ein zentrales TODO-Limit (default: 10)

set -euo pipefail
IFS=$'\n\t'

# =============================================================
# ZENTRALE KONFIG
# =============================================================

# Maximal erlaubte TODOs (kann via ENV überschrieben werden: MAX_TODOS=12 ./todo_report.sh)
MAX_TODOS="${MAX_TODOS:-10}"

# Wenn true: Exit != 0, sobald MAX_TODOS überschritten ist (CI-Gate)
FAIL_ON_OVER_LIMIT="${FAIL_ON_OVER_LIMIT:-true}"

# Wenn true: Exit != 0, sobald nicht-policy-konforme TODOs gefunden werden
FAIL_ON_NON_COMPLIANT="${FAIL_ON_NON_COMPLIANT:-false}"

# =============================================================
# PATHS
# =============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SPECS_DIR="${PROJECT_ROOT}/tests/e2e/browseri/playwright/specs"

# =============================================================
# OUTPUT / COLORS (nur wenn TTY)
# =============================================================

if [[ -t 1 ]]; then
    RED=$'\033[0;31m'
    GREEN=$'\033[0;32m'
    YELLOW=$'\033[0;33m'
    BLUE=$'\033[0;34m'
    NC=$'\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

die() {
    printf "%sERROR:%s %s\n" "${RED}" "${NC}" "$*" >&2
    exit 1
}

hr() {
    printf "===================================\n"
}

title() {
    hr
    printf "   %s\n" "$1"
    hr
    printf "\n"
}

# =============================================================
# VALIDATION
# =============================================================

[[ -d "${SPECS_DIR}" ]] || die "Specs-Verzeichnis nicht gefunden: ${SPECS_DIR}"

# =============================================================
# COLLECTION
# =============================================================

# Alle TODO-Zeilen (file:line:content)
mapfile -t ALL_TODOS < <(grep -RIn --include="*.spec.ts" "TODO" "${SPECS_DIR}" 2>/dev/null || true)

# Policy-konform: TODO(<...>): <...>
# (grep -E ist portable; kein -P wegen macOS)
mapfile -t COMPLIANT < <(grep -REn --include="*.spec.ts" "TODO\([^)]+\):" "${SPECS_DIR}" 2>/dev/null || true)

total_todos="${#ALL_TODOS[@]}"
policy_compliant="${#COMPLIANT[@]}"

# Nicht-konform = TODO vorhanden, aber nicht im Policy-Format
NON_COMPLIANT=()
for line in "${ALL_TODOS[@]}"; do
    if [[ ! "${line}" =~ TODO\([^\)]+\): ]]; then
        NON_COMPLIANT+=("${line}")
    fi
done
non_compliant="${#NON_COMPLIANT[@]}"

# =============================================================
# HEADER + LIMIT CHECK
# =============================================================

title "Playwright E2E TODO-Report"

printf "%sSpecs:%s %s\n" "${BLUE}" "${NC}" "${SPECS_DIR}"
printf "%sTODO-Limit:%s %s (MAX_TODOS)\n" "${BLUE}" "${NC}" "${MAX_TODOS}"
printf "\n"

printf "%sGesamt-TODOs:%s %d\n" "${BLUE}" "${NC}" "${total_todos}"
printf "%sPolicy-konform:%s %d\n" "${GREEN}" "${NC}" "${policy_compliant}"
if (( non_compliant > 0 )); then
    printf "%sNicht policy-konform:%s %d\n" "${RED}" "${NC}" "${non_compliant}"
else
    printf "%sAlle TODOs sind policy-konform.%s\n" "${GREEN}" "${NC}"
fi

# Limit enforcement (hart)
over_limit=false
if (( total_todos > MAX_TODOS )); then
    over_limit=true
    printf "\n%sLIMIT:%s %d TODOs gefunden, erlaubt sind max. %d.\n" "${RED}" "${NC}" "${total_todos}" "${MAX_TODOS}"
fi

printf "\n"

# =============================================================
# NON-COMPLIANT DETAILS
# =============================================================

if (( non_compliant > 0 )); then
    title "WARNUNG: Nicht-konforme TODOs"
    printf "%sErwartetes Format:%s TODO(<ISSUE-ID>): <Beschreibung>\n\n" "${YELLOW}" "${NC}"
    for entry in "${NON_COMPLIANT[@]}"; do
        printf "    - %s\n" "${entry}"
    done
    printf "\n"
    printf "%sBitte aktualisieren gemäß TODO_POLICY.md%s\n\n" "${YELLOW}" "${NC}"
fi

# =============================================================
# GROUPING (single pass over compliant TODOs)
# =============================================================

FRONTEND=()
BACKEND=()
INFRA=()
OTHER=()

for entry in "${COMPLIANT[@]}"; do
    # entry: file:line:content
    IFS=: read -r file line content <<< "${entry}"

    # meta = Inhalt innerhalb TODO(...)
    meta="${content#*TODO(}"
    meta="${meta%%)*}"

    # desc = alles nach "):"
    desc="${content#*):}"
    desc="${desc# }"

    file_short="$(basename "${file}")"
    pretty="    - ${file_short}:${line}\n        ${meta}: ${desc}"

    if [[ "${meta}" == FRONTEND* ]]; then
        FRONTEND+=("${pretty}")
    elif [[ "${meta}" == BACKEND* ]]; then
        BACKEND+=("${pretty}")
    elif [[ "${meta}" == TEST-INFRA* || "${meta}" == INFRA* ]]; then
        INFRA+=("${pretty}")
    else
        OTHER+=("${pretty}")
    fi
done

print_group() {
    local name="$1"
    shift
    local -a items=("$@")
    local count="${#items[@]}"
    (( count == 0 )) && return 0

    printf "%s%s (%d):%s\n" "${BLUE}" "${name}" "${count}" "${NC}"
    for item in "${items[@]}"; do
        # item enthält \n Sequenzen bewusst
        printf "%b\n" "${item}"
    done
    printf "\n"
}

title "TODOs nach Kategorie"
print_group "Frontend-Features" "${FRONTEND[@]}"
print_group "Backend-Features" "${BACKEND[@]}"
print_group "Test-Infrastruktur" "${INFRA[@]}"
print_group "Sonstige" "${OTHER[@]}"

# =============================================================
# SUMMARY + EXIT CODE
# =============================================================

title "Zusammenfassung"
printf "Frontend-blockiert: %d\n" "${#FRONTEND[@]}"
printf "Backend-blockiert:  %d\n" "${#BACKEND[@]}"
printf "Test-Infra:         %d\n" "${#INFRA[@]}"
printf "Sonstige:           %d\n" "${#OTHER[@]}"
printf "\n"
printf "%sPolicy-konforme TODOs:%s %d\n" "${GREEN}" "${NC}" "${policy_compliant}"

exit_code=0
if [[ "${FAIL_ON_OVER_LIMIT}" == "true" ]] && [[ "${over_limit}" == "true" ]]; then
    exit_code=2
fi
if [[ "${FAIL_ON_NON_COMPLIANT}" == "true" ]] && (( non_compliant > 0 )); then
    exit_code=1
fi

if (( exit_code != 0 )); then
    printf "\n%sExit-Code:%s %d\n" "${YELLOW}" "${NC}" "${exit_code}"
fi

printf "\nReport abgeschlossen.\n"
exit "${exit_code}"