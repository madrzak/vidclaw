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
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')" || SERVER_IP=""
log_info "SSH tunnel example: ssh -L ${VIDCLAW_PORT}:localhost:${VIDCLAW_PORT} root@${SERVER_IP:-<server-ip>}"
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
