#!/usr/bin/env bash

################################################################################
# FINALIZE ALL – Beendet Backend- und Frontend‑Prozesse des Projekts
#
# Zweck:
#   - Beendet alle relevanten Dev‑Server des Projekts (Backend/FastAPI/uvicorn,
#     Frontend/Expo/Node) – unabhängig von Ports und Mehrfachinstanzen.
#   - Sicher: Es werden nur Prozesse beendet, die Dateien innerhalb des
#     Projektverzeichnisses geöffnet haben und/oder über PID‑Files bekannt sind.
#
# Features:
#   - Sanftes Beenden (SIGTERM) mit Timeout, danach hartes Kill (SIGKILL)
#   - Idempotent (mehrfach ausführen möglich)
#   - Optional: --dry-run (nur anzeigen), --timeout=<sek>
################################################################################

set -Eeuo pipefail

# Verzeichnisse & Libs
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
LIB_DIR="${SCRIPT_DIR}/../lib"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/../../.." &>/dev/null && pwd)"

# Shell-Libs laden
# shellcheck source=../lib/logging.sh
source "${LIB_DIR}/logging.sh"
# shellcheck source=../lib/checks.sh
source "${LIB_DIR}/checks.sh"

# Defaults
DRY_RUN=0
TIMEOUT=10

usage() {
  cat <<USAGE
Verwendung: tools/dev/orchestration/finalize_all.sh [--dry-run] [--timeout=<sekunden>]

Optionen:
  --dry-run            Zeigt nur an, was beendet würde (keine Signale senden)
  --timeout=<sek>      Wartezeit nach SIGTERM bevor SIGKILL gesendet wird (Default: 10)
USAGE
}

parse_args() {
  for arg in "$@"; do
    case "${arg}" in
      --dry-run)
        DRY_RUN=1
        ;;
      --timeout=*)
        TIMEOUT="${arg#*=}"
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log_error "Unbekannte Option: ${arg}"
        usage
        exit 1
        ;;
    esac
  done
}

require_tools() {
  # lsof und ps werden benötigt
  check_command_exists lsof || exit 1
  check_command_exists ps || exit 1
}

pid_belongs_to_project() {
  local pid="$1"
  # Prüfe, ob Prozess beliebige geöffnete Dateien unterhalb des Projektpfads hat
  if lsof -p "${pid}" 2>/dev/null | grep -F -- "${PROJECT_ROOT}/" >/dev/null; then
    return 0
  fi
  return 1
}

collect_candidate_pids() {
  local -a pids=()

  # 1) Alle TCP-Listener erfassen (Ports egal)
  local -a listener_pids=()
  if mapfile -t listener_pids < <(lsof -n -P -iTCP -sTCP:LISTEN -t 2>/dev/null | sort -u); then
    :
  fi

  # 2) Bekannte Service-PIDs aus PID‑Files (falls vorhanden)
  local pidfile
  for pidfile in /tmp/backend.pid /tmp/frontend.pid; do
    if [[ -f "${pidfile}" ]]; then
      local pf_pid
      pf_pid="$(cat "${pidfile}" 2>/dev/null || true)"
      if [[ -n "${pf_pid}" && "${pf_pid}" =~ ^[0-9]+$ ]]; then
        listener_pids+=("${pf_pid}")
      fi
    fi
  done

  # 3) Fallback: typische Dev‑Muster (uvicorn/expo/npm web)
  local -a pattern_pids=()
  if mapfile -t pattern_pids < <(
      ps -eo pid=,args= |
        grep -E "uvicorn .*app\.main:app|npm run web|node .*expo|@expo/cli" |
        grep -v grep |
        awk '{print $1}' |
        sort -u 2>/dev/null
    ); then
    :
  fi

  # Vereinen
  local -A seen=()
  local x
  for x in "${listener_pids[@]:-}" "${pattern_pids[@]:-}"; do
    [[ -n "${x:-}" ]] || continue
    if [[ "${x}" =~ ^[0-9]+$ ]]; then
      seen["$x"]=1
    fi
  done

  # Filtern: Nur Prozesse, die zum Projekt gehören
  for x in "${!seen[@]}"; do
    if pid_belongs_to_project "${x}"; then
      pids+=("${x}")
    fi
  done

  # Ausgabe
  printf "%s\n" "${pids[@]:-}" | sort -u
}

terminate_pids() {
  local -a targets=()
  if mapfile -t targets; then :; fi

  if [[ ${#targets[@]} -eq 0 ]]; then
    log_success "Keine laufenden Homewidget‑Prozesse gefunden (nichts zu tun)."
    return 0
  fi

  log_info "Zu beendende PIDs: ${targets[*]}"

  # Sanftes Beenden
  local pid
  for pid in "${targets[@]}"; do
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log_info "[DRY‑RUN] Würde SIGTERM senden an PID ${pid}"
    else
      if kill -TERM "${pid}" 2>/dev/null; then
        log_info "SIGTERM gesendet an PID ${pid}"
      else
        log_warn "Konnte SIGTERM nicht senden (PID ${pid} existiert evtl. nicht mehr)"
      fi
    fi
  done

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log_success "Dry‑Run abgeschlossen."
    return 0
  fi

  # Warten bis beendet oder Timeout
  local end=$((SECONDS + TIMEOUT))
  local -a remaining=("${targets[@]}")
  while [[ ${#remaining[@]} -gt 0 && ${SECONDS} -lt ${end} ]]; do
    local -a still=()
    for pid in "${remaining[@]}"; do
      if kill -0 "${pid}" 2>/dev/null; then
        still+=("${pid}")
      fi
    done
    remaining=("${still[@]:-}")
    if [[ ${#remaining[@]} -eq 0 ]]; then
      break
    fi
    sleep 0.5
  done

  # Hartes Kill für verbleibende
  if [[ ${#remaining[@]} -gt 0 ]]; then
    log_warn "Sende SIGKILL an verbleibende PIDs: ${remaining[*]}"
    for pid in "${remaining[@]}"; do
      kill -KILL "${pid}" 2>/dev/null || true
    done
  fi

  # PID‑Files aufräumen
  for pf in /tmp/backend.pid /tmp/frontend.pid; do
    [[ -f "${pf}" ]] && rm -f "${pf}"
  done

  log_success "Finalisierung abgeschlossen."
}

main() {
  parse_args "$@"
  log_info "════════════════════════════════════════════════════════════════"
  log_info "🛑 HOMEWIDGET FINALIZE ALL"
  log_info "════════════════════════════════════════════════════════════════"
  log_info "Projekt: ${PROJECT_ROOT}"

  require_tools

  # Kandidaten sammeln & terminieren
  local -a candidates=()
  if mapfile -t candidates < <(collect_candidate_pids); then :; fi
  printf "%s\n" "${candidates[@]:-}" | terminate_pids
}

main "$@"
