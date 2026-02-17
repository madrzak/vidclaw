#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./start.sh [options]

Options:
  --dev               Start local dev mode (backend + vite)
  --dry-run           Print actions without executing them
  --interactive       Allow interactive sudo prompts when needed
  --service-mode MODE Override service mode (auto|systemd|launchd|direct|none)
  -h, --help          Show this help
HELP
}

MODE="service"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      MODE="dev"
      ;;
    --dry-run)
      enable_dry_run
      ;;
    --interactive)
      enable_interactive_sudo
      ;;
    --service-mode)
      [[ $# -gt 1 ]] || die "Missing value for --service-mode" "Use auto, systemd, launchd, direct, or none."
      set_service_mode "$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1" "Run ./start.sh --help for usage."
      ;;
  esac
  shift
done

start_dev_mode() {
  init_runtime
  cd "${REPO_ROOT}"

  local backend_pid=""
  if port_in_use "${VIDCLAW_PORT}"; then
    log_warn "Port ${VIDCLAW_PORT} is already in use; assuming backend is already running."
  else
    log_info "Starting backend on http://127.0.0.1:${VIDCLAW_PORT}"
    if is_dry_run; then
      log_info "[dry-run] $(command_display "${NODE_BIN}" "${REPO_ROOT}/server.js")"
    else
      "${NODE_BIN}" "${REPO_ROOT}/server.js" &
      backend_pid="$!"
      sleep 1
      if ! kill -0 "${backend_pid}" >/dev/null 2>&1; then
        die "Backend process exited early." "Check server output and retry."
      fi
    fi
  fi

  cleanup() {
    if [[ -n "${backend_pid}" ]] && kill -0 "${backend_pid}" >/dev/null 2>&1; then
      kill "${backend_pid}" >/dev/null 2>&1 || true
    fi
  }
  trap cleanup EXIT INT TERM

  log_info "Starting Vite dev server..."
  run_cmd "${NPM_BIN}" run dev
}

init_os
assert_repo_layout

if [[ "${MODE}" == "dev" ]]; then
  start_dev_mode
else
  log_info "Starting service in $(service_mode) mode..."
  start_service
  log_ok "Service start command completed."
fi
