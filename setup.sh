#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./setup.sh [options]

Options:
  --dry-run           Print actions without executing them
  --interactive       Allow interactive sudo prompts when needed
  --skip-service      Install/build only; do not install service
  --skip-heartbeat    Do not modify ../HEARTBEAT.md
  --tailscale [PORT]  Enable Tailscale Serve integration (default port: 8443)
  --service-mode MODE Override service mode (auto|systemd|launchd|direct|none)
  -h, --help          Show this help

Environment:
  DRY_RUN=1           Same as --dry-run
  ALLOW_INTERACTIVE=1 Same as --interactive
  VIDCLAW_SERVICE_MODE=auto|systemd|launchd|direct|none
  FORCE_HEARTBEAT=1   Force HEARTBEAT.md update outside */workspace/dashboard
HELP
}

SKIP_SERVICE=0
SKIP_HEARTBEAT="${SKIP_HEARTBEAT:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      enable_dry_run
      ;;
    --interactive)
      enable_interactive_sudo
      ;;
    --skip-service)
      SKIP_SERVICE=1
      ;;
    --skip-heartbeat)
      SKIP_HEARTBEAT=1
      ;;
    --tailscale)
      enable_tailscale
      if [[ "${2:-}" =~ ^[0-9]+$ ]]; then
        TAILSCALE_PORT="$2"
        shift
      fi
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
      die "Unknown option: $1" "Run ./setup.sh --help for usage."
      ;;
  esac
  shift
done

ensure_heartbeat_block() {
  [[ "${SKIP_HEARTBEAT}" == "1" ]] && {
    log_info "Skipping HEARTBEAT.md update by request."
    return 0
  }

  local parent_dir parent_name repo_name heartbeat_file
  parent_dir="$(dirname "${REPO_ROOT}")"
  parent_name="$(basename "${parent_dir}")"
  repo_name="$(basename "${REPO_ROOT}")"
  heartbeat_file="${parent_dir}/HEARTBEAT.md"

  if [[ "${repo_name}" != "dashboard" || "${parent_name}" != "workspace" ]]; then
    if [[ "${FORCE_HEARTBEAT:-0}" != "1" ]]; then
      log_warn "Skipping HEARTBEAT.md update outside */workspace/dashboard. Set FORCE_HEARTBEAT=1 to override."
      return 0
    fi
  fi

  if [[ -f "${heartbeat_file}" ]] && grep -q "## Task Queue Check" "${heartbeat_file}" 2>/dev/null; then
    log_info "HEARTBEAT.md already contains Task Queue Check block."
    return 0
  fi

  if is_dry_run; then
    log_info "[dry-run] would append Task Queue Check block to ${heartbeat_file}"
    return 0
  fi

  touch "${heartbeat_file}"
  cat >> "${heartbeat_file}" <<'HEARTBEAT_BLOCK'

## Task Queue Check
0. Record heartbeat: POST http://localhost:3333/api/heartbeat via exec (curl -X POST)
1. Check for stuck in-progress tasks: GET http://localhost:3333/api/tasks and look for status "in-progress"
2. For each in-progress task: check if a sub-agent completed the work (use sessions_list to find recent sub-agents, check their last message for completion). If done, POST to http://localhost:3333/api/tasks/{id}/complete with { "result": "<summary from sub-agent>" }. If the task has been in-progress for over 10 minutes with no active sub-agent, POST with { "error": "Task timed out — no active sub-agent found" }.
3. Fetch http://localhost:3333/api/tasks/queue via exec (curl)
4. If any tasks returned, pick the FIRST one (highest priority)
5. Mark it as picked up: POST to http://localhost:3333/api/tasks/{id}/pickup
6. Spawn a sub-agent with the task: use sessions_spawn with the task title + description as the prompt. If a skill is assigned, tell the sub-agent to read that skill's SKILL.md first.
7. When the sub-agent completes, POST to http://localhost:3333/api/tasks/{id}/complete with { "result": "<summary of what was done>" } or { "error": "<what went wrong>" } if it failed
8. Only process ONE task per heartbeat to avoid overload
HEARTBEAT_BLOCK

  log_ok "Added Task Queue Check block to ${heartbeat_file}"
}

init_os
assert_repo_layout
init_runtime
init_tailscale
ensure_data_dir
EFFECTIVE_MODE="$(service_mode)"

echo "⚡ VidClaw Setup"
print_runtime_summary

if port_in_use "${VIDCLAW_PORT}"; then
  log_warn "Port ${VIDCLAW_PORT} is already in use. Setup can continue, but service start may fail."
fi

cd "${REPO_ROOT}"
log_info "Installing dependencies..."
npm_install_dependencies

log_info "Building frontend..."
npm_build

if [[ "${SKIP_SERVICE}" == "1" ]]; then
  log_warn "Skipping service installation (--skip-service)."
else
  log_info "Installing service in ${EFFECTIVE_MODE} mode..."
  install_service
fi

ensure_heartbeat_block

echo
log_ok "Setup complete."
log_info "Dashboard URL: http://localhost:${VIDCLAW_PORT}"
log_info "SSH tunnel example: ssh -L ${VIDCLAW_PORT}:localhost:${VIDCLAW_PORT} <user>@<server-host>"
log_info "Service helpers: ./start.sh ./stop.sh ./status.sh ./logs.sh ./uninstall.sh"

if is_macos && [[ "${EFFECTIVE_MODE}" == "launchd" ]]; then
  log_info "LaunchAgent plist: ${HOME}/Library/LaunchAgents/${VIDCLAW_LAUNCHD_LABEL}.plist"
  log_info "Optional LaunchDaemon mode (root) is documented in README.md."
fi

if [[ "${EFFECTIVE_MODE}" == "direct" ]]; then
  log_info "Direct mode logs: ${DATA_DIR}/vidclaw.direct.out.log and ${DATA_DIR}/vidclaw.direct.err.log"
fi

if is_tailscale_enabled; then
  ts_hostname="$(tailscale status --json 2>/dev/null \
    | "${NODE_BIN}" -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).Self.DNSName.replace(/\.$/,''))}catch{console.log('your-machine.your-tailnet.ts.net')}})" 2>/dev/null \
    || echo "your-machine.your-tailnet.ts.net")"
  log_info "Tailscale URL: https://${ts_hostname}:${TAILSCALE_PORT}/"
fi
