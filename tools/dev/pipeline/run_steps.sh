#!/usr/bin/env bash
set -Eeuo pipefail

## @file run_steps.sh
## @brief Lokaler Pipeline-Runner, der auf ci_steps.sh aufsetzt.
##
## Beispiel:
##   tools/dev/pipeline/run_steps.sh all
##   tools/dev/pipeline/run_steps.sh backend
##   tools/dev/pipeline/run_steps.sh mobile
##   tools/dev/pipeline/run_steps.sh tests

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
CI_STEPS="${SCRIPT_DIR}/ci_steps.sh"

if [[ ! -f "${CI_STEPS}" ]]; then
    echo "[run-steps][ERROR] ci_steps.sh wurde nicht gefunden unter ${CI_STEPS}" >&2
    exit 1
fi

usage() {
    cat <<USAGE
Verwendung: tools/dev/pipeline/run_steps.sh [all|backend|mobile|tests]

  all        Vollständige Pipeline (Backend + Mobile)
  backend    Nur Backend-Pipeline
  mobile     Nur Mobile-Pipeline
  tests      Nur Test-Pipeline
USAGE
}

main() {
    local target="${1:-all}"

    case "${target}" in
        all)
            bash "${CI_STEPS}" pipeline_all
            ;;
        backend)
            bash "${CI_STEPS}" pipeline_backend
            ;;
        mobile)
            bash "${CI_STEPS}" pipeline_mobile
            ;;
        tests)
            bash "${CI_STEPS}" pipeline_tests
            ;;
        *)
            echo "[run-steps][ERROR] Unbekanntes Ziel: ${target}" >&2
            usage
            exit 1
            ;;
    esac
}

main "$@"