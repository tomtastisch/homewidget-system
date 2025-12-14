#!/usr/bin/env bash
# TODO-Report für Playwright E2E Tests
#
# Features
# - Sucht TODOs in Playwright *.spec.ts (mit File- und Kategorie-Excludes)
# - Kategorie = zuletzt gesehener Test-Tag im Titel: @<KNOWN_CATEGORIES> (sonst: unknown)
# - Policy-Check: TODO(<ISSUE-ID>): <Beschreibung>
# - Zentrales TODO-Limit (default: 10), optional als CI-Gate

set -euo pipefail
IFS=$'\n\t'

# =============================================================
# ZENTRALE KONFIG
# =============================================================

MAX_TODOS="${MAX_TODOS:-1}"
FAIL_ON_OVER_LIMIT="${FAIL_ON_OVER_LIMIT:-true}"
FAIL_ON_NON_COMPLIANT="${FAIL_ON_NON_COMPLIANT:-false}"

KNOWN_CATEGORIES=(
    "minimal"
    "standard"
    "advanced"
)

# Kategorien, die komplett ignoriert werden (z. B. "advanced" oder "unknown")
EXCLUDED_CATEGORIES=(
    "advanced"
    # "unknown"
)

# Excludes: Basename oder glob patterns relativ zum SPECS_DIR.
EXCLUDED_SPECS=(
    # "auth.resilience.spec.ts"
    # "browser.spec.ts"
    # "legacy/*.spec.ts"
    # "*experimental*.spec.ts"
)

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
    RED='' GREEN='' YELLOW='' BLUE='' NC=''
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

bool_is_true() {
    [[ "${1}" == "true" ]]
}

join_by_comma() {
    local IFS=,
    printf "%s" "$*"
}

# =============================================================
# VALIDATION
# =============================================================

[[ -d "${SPECS_DIR}" ]] || die "Specs-Verzeichnis nicht gefunden: ${SPECS_DIR}"

# =============================================================
# EXCLUDES
# =============================================================

is_glob_pattern() {
    local s="$1"
    [[ "${s}" == *"*"* || "${s}" == *"?"* || "${s}" == *"["* ]]
}

is_excluded_category() {
    local cat="$1"
    local ex
    for ex in "${EXCLUDED_CATEGORIES[@]}"; do
        [[ -z "${ex}" ]] && continue
        if [[ "${cat}" == "${ex}" ]]; then
            return 0
        fi
    done
    return 1
}

is_excluded_file() {
    local abs_file="$1"

    # Robust ohne Pattern-Expansion (kein ${var#${other}/})
    local rel_file="${abs_file}"
    local prefix="${SPECS_DIR}/"
    if [[ "${abs_file}" == "${prefix}"* ]]; then
        rel_file="${abs_file:${#prefix}}"
    fi

    local base_file
    base_file="$(basename -- "${abs_file}")"

    local pattern
    for pattern in "${EXCLUDED_SPECS[@]}"; do
        [[ -z "${pattern}" ]] && continue

        if is_glob_pattern "${pattern}"; then
            # Intentionally enable glob matching when config contains glob meta chars.
            # shellcheck disable=SC2053
            if [[ "${base_file}" == ${pattern} ]] || [[ "${rel_file}" == ${pattern} ]]; then
                return 0
            fi
        else
            if [[ "${base_file}" == "${pattern}" ]] || [[ "${rel_file}" == "${pattern}" ]]; then
                return 0
            fi
        fi
    done

    return 1
}

collect_spec_files() {
    local -a files=()
    local f

    while IFS= read -r -d '' f; do
        if is_excluded_file "${f}"; then
            continue
        fi
        files+=("${f}")
    done < <(find "${SPECS_DIR}" -type f -name "*.spec.ts" -print0)

    printf "%s\n" "${files[@]}"
}

mapfile -t SPEC_FILES < <(collect_spec_files)

if (( ${#SPEC_FILES[@]} == 0 )); then
    title "Playwright E2E TODO-Report"
    printf "%sSpecs:%s %s\n\n" "${BLUE}" "${NC}" "${SPECS_DIR}"
    printf "%sKeine Spec-Files gefunden (nach Excludes).%s\n" "${YELLOW}" "${NC}"
    exit 0
fi

KNOWN_CATEGORIES_CSV="$(join_by_comma "${KNOWN_CATEGORIES[@]}")"

# =============================================================
# SCAN (awk): 1 Pass
# Output TSV:
#     category \t file \t line \t policy_ok(1/0) \t content
# =============================================================
scan_todos_tsv() {
    awk \
        -v known_cats_csv="${KNOWN_CATEGORIES_CSV}" \
        '
        function detect_category(line,    n, i, cat, tag) {
            if (known_cats_csv == "") return ""
            n = split(known_cats_csv, cats, ",")
            for (i = 1; i <= n; i++) {
                cat = cats[i]
                if (cat == "") continue
                tag = "@" cat
                if (index(line, tag) > 0) return cat
            }
            return ""
        }

        function comment_part(line,    i) {
            i = index(line, "//")
            if (i > 0) return substr(line, i + 2)

            i = index(line, "/*")
            if (i > 0) return substr(line, i + 2)

            return ""
        }

        function is_todo_comment(cmt) {
            # Nur echte TODO-Kommentare zählen: TODO: ... oder TODO(....):
            # Damit werden z.B. "TODO-CREATE-..." oder Strings nicht gezählt.
            return (cmt ~ /TODO[[:space:]]*[:(]/)
        }

        BEGIN {
            current_cat = "unknown"
        }

        {
            if ($0 ~ /test\(/) {
                c = detect_category($0)
                if (c != "") current_cat = c
            }

            cmt = comment_part($0)
            if (cmt == "") next
            if (!is_todo_comment(cmt)) next

            policy_ok = (cmt ~ /TODO\([^)]+\):/) ? 1 : 0
            printf "%s\t%s\t%d\t%d\t%s\n", current_cat, FILENAME, FNR, policy_ok, $0
        }
    ' "${SPEC_FILES[@]}"
}

mapfile -t TODO_ROWS < <(scan_todos_tsv 2>/dev/null || true)

# =============================================================
# AGGREGATION
# =============================================================

declare -A GROUP_COUNT=()
declare -A GROUP_LINES=()

init_groups() {
    local cat
    for cat in "${KNOWN_CATEGORIES[@]}"; do
        GROUP_COUNT["${cat}"]=0
        GROUP_LINES["${cat}"]=""
    done
    GROUP_COUNT["unknown"]=0
    GROUP_LINES["unknown"]=""
}

append_group_line() {
    local cat="$1"
    local line="$2"

    if [[ -z "${GROUP_LINES[${cat}]}" ]]; then
        GROUP_LINES["${cat}"]="${line}"
    else
        GROUP_LINES["${cat}"]+=$'\n'"${line}"
    fi
}

total_todos=0
excluded_by_search=0
policy_compliant=0
non_compliant=0
NON_COMPLIANT_LINES=""

append_non_compliant() {
    local line="$1"
    if [[ -z "${NON_COMPLIANT_LINES}" ]]; then
        NON_COMPLIANT_LINES="${line}"
    else
        NON_COMPLIANT_LINES+=$'\n'"${line}"
    fi
}

init_groups

for row in "${TODO_ROWS[@]}"; do
    IFS=$'\t' read -r cat file line policy_ok content <<< "${row}"
    [[ -z "${cat}" ]] && cat="unknown"
    [[ -z "${GROUP_COUNT[${cat}]+x}" ]] && cat="unknown"

    if is_excluded_category "${cat}"; then
        (( excluded_by_search += 1 ))
        continue
    fi

    (( total_todos += 1 ))
    (( GROUP_COUNT["${cat}"] += 1 ))

    if [[ "${policy_ok}" == "1" ]]; then
        (( policy_compliant += 1 ))
    else
        (( non_compliant += 1 ))
        append_non_compliant "    - ${cat}: ${file}:${line}: ${content}"
    fi

    file_short="$(basename -- "${file}")"
    append_group_line "${cat}" "    - ${file_short}:${line}"$'\n'"        ${content}"
done

over_limit=false
if (( total_todos > MAX_TODOS )); then
    over_limit=true
fi

# =============================================================
# REPORT
# =============================================================

title "Playwright E2E TODO-Report"

printf "%sSpecs:%s %s\n" "${BLUE}" "${NC}" "${SPECS_DIR}"
printf "%sTODO-Limit:%s %s (MAX_TODOS)\n" "${BLUE}" "${NC}" "${MAX_TODOS}"
printf "%sKnown categories:%s %s\n" "${BLUE}" "${NC}" "${KNOWN_CATEGORIES_CSV:-"(none)"}"

printf "%sExcluded specs:%s %d\n" "${BLUE}" "${NC}" "${#EXCLUDED_SPECS[@]}"
if (( ${#EXCLUDED_SPECS[@]} > 0 )); then
    for p in "${EXCLUDED_SPECS[@]}"; do
        printf "    - %s\n" "${p}"
    done
fi

printf "%sExcluded categories:%s %d\n" "${BLUE}" "${NC}" "${#EXCLUDED_CATEGORIES[@]}"
if (( ${#EXCLUDED_CATEGORIES[@]} > 0 )); then
    for c in "${EXCLUDED_CATEGORIES[@]}"; do
        printf "    - %s\n" "${c}"
    done
fi
printf "\n"

printf "%sExcluded by Search:%s %d\n" "${BLUE}" "${NC}" "${excluded_by_search}"
printf "%sGesamt-TODOs (nach Excludes):%s %d\n" "${BLUE}" "${NC}" "${total_todos}"
printf "%sPolicy-konform:%s %d\n" "${GREEN}" "${NC}" "${policy_compliant}"
if (( non_compliant > 0 )); then
    printf "%sNicht policy-konform:%s %d\n" "${RED}" "${NC}" "${non_compliant}"
else
    printf "%sAlle TODOs sind policy-konform.%s\n" "${GREEN}" "${NC}"
fi

if [[ "${over_limit}" == "true" ]]; then
    printf "\n%sLIMIT:%s %d TODOs gefunden, erlaubt sind max. %d.\n" "${RED}" "${NC}" "${total_todos}" "${MAX_TODOS}"
fi
printf "\n"

if (( non_compliant > 0 )); then
    title "WARNUNG: Nicht-konforme TODOs"
    printf "%sErwartetes Format:%s TODO(<ISSUE-ID>): <Beschreibung>\n\n" "${YELLOW}" "${NC}"
    printf "%b\n\n" "${NON_COMPLIANT_LINES}"
    printf "%sBitte aktualisieren gemäß TODO_POLICY.md%s\n\n" "${YELLOW}" "${NC}"
fi

print_category_block() {
    local cat="$1"
    local label="$2"

    if is_excluded_category "${cat}"; then
        printf "%s%s:%s Excluded by Search\n\n" "${BLUE}" "${label}" "${NC}"
        return 0
    fi

    local count="${GROUP_COUNT[${cat}]:-0}"
    printf "%s%s:%s %d\n" "${BLUE}" "${label}" "${NC}" "${count}"

    if (( count > 0 )); then
        printf "%b\n\n" "${GROUP_LINES[${cat}]}"
    else
        printf "\n"
    fi
}

title "TODOs nach Test-Kategorie (nach Excludes)"
for cat in "${KNOWN_CATEGORIES[@]}"; do
    print_category_block "${cat}" "@${cat}"
done
print_category_block "unknown" "unknown (kein @tag gefunden)"

title "Zusammenfassung"
for cat in "${KNOWN_CATEGORIES[@]}"; do
    if is_excluded_category "${cat}"; then
        printf "@%s: Excluded by Search\n" "${cat}"
    else
        printf "@%s: %d\n" "${cat}" "${GROUP_COUNT[${cat}]}"
    fi
done
if is_excluded_category "unknown"; then
    printf "unknown: Excluded by Search\n"
else
    printf "unknown: %d\n" "${GROUP_COUNT[unknown]}"
fi
printf "\n"
printf "%sPolicy-konforme TODOs:%s %d\n" "${GREEN}" "${NC}" "${policy_compliant}"

exit_code=0
if bool_is_true "${FAIL_ON_OVER_LIMIT}" && [[ "${over_limit}" == "true" ]]; then
    exit_code=2
fi
if bool_is_true "${FAIL_ON_NON_COMPLIANT}" && (( non_compliant > 0 )); then
    exit_code=1
fi

if (( exit_code != 0 )); then
    printf "\n%sExit-Code:%s %d\n" "${YELLOW}" "${NC}" "${exit_code}"
fi

printf "\nReport abgeschlossen.\n"
exit "${exit_code}"