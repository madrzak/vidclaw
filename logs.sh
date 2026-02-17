#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./logs.sh [options]

Options:
  -n, --lines N       Number of lines to show first (default: 200)
  -f, --follow        Follow logs (default)
      --no-follow     Do not follow logs
      --dry-run       Print actions without executing them
      --interactive   Allow interactive sudo prompts when needed
      --service-mode MODE
                      Override service mode (auto|systemd|launchd|direct|none)
  -h, --help          Show this help
HELP
}

LINES=200
FOLLOW=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--lines)
      [[ $# -gt 1 ]] || die "Missing value for $1" "Provide a positive integer, for example: --lines 100"
      LINES="$2"
      shift
      ;;
    -f|--follow)
      FOLLOW=1
      ;;
    --no-follow)
      FOLLOW=0
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
      die "Unknown option: $1" "Run ./logs.sh --help for usage."
      ;;
  esac
  shift
done

[[ "${LINES}" =~ ^[1-9][0-9]*$ ]] || die "Invalid --lines value: ${LINES}" "Use an integer greater than 0."

init_os
assert_repo_layout

logs_service "${LINES}" "${FOLLOW}"
