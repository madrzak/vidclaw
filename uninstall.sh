#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./uninstall.sh [options]

Options:
  --purge-data        Remove data/*.json and data/vidclaw*.log files after service uninstall
  --dry-run           Print actions without executing them
  --interactive       Allow interactive sudo prompts when needed
  --service-mode MODE Override service mode (auto|systemd|launchd|direct|none)
  -h, --help          Show this help
HELP
}

PURGE_DATA=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --purge-data)
      PURGE_DATA=1
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
      die "Unknown option: $1" "Run ./uninstall.sh --help for usage."
      ;;
  esac
  shift
done

init_os
assert_repo_layout

log_info "Removing service in $(service_mode) mode..."
uninstall_service

if [[ "${PURGE_DATA}" == "1" ]]; then
  log_warn "Purging runtime data files from ${DATA_DIR}"
  run_cmd find "${DATA_DIR}" -maxdepth 1 -type f \
    \( -name '*.json' -o -name 'vidclaw*.log' -o -name 'vidclaw*.err.log' -o -name 'vidclaw*.out.log' -o -name 'vidclaw.pid' \) \
    -exec rm -f {} +
  log_ok "Runtime data purged."
else
  log_info "Runtime data preserved. Use --purge-data to remove data files."
fi

log_ok "Uninstall complete."
