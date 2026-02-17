#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./stop.sh [options]

Options:
  --dry-run           Print actions without executing them
  --interactive       Allow interactive sudo prompts when needed
  --service-mode MODE Override service mode (auto|systemd|launchd|direct|none)
  -h, --help          Show this help
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
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
      die "Unknown option: $1" "Run ./stop.sh --help for usage."
      ;;
  esac
  shift
done

init_os
assert_repo_layout

log_info "Stopping service in $(service_mode) mode..."
stop_service
log_ok "Stop command completed."
