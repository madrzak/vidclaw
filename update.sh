#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./update.sh [options]

Options:
  --dry-run            Print actions without executing them
  --interactive        Allow interactive sudo prompts when needed
  --skip-git           Skip git fetch/pull
  --skip-build         Skip npm install + build
  --no-restart         Do not restart service after update
  --allow-merge-pull   Allow non-ff git pull when ff-only fails
  --service-mode MODE  Override service mode (auto|systemd|launchd|direct|none)
  -h, --help           Show this help

Environment:
  DRY_RUN=1
  ALLOW_INTERACTIVE=1
  ALLOW_MERGE_PULL=1
  VIDCLAW_SERVICE_MODE=auto|systemd|launchd|direct|none
HELP
}

SKIP_GIT=0
SKIP_BUILD=0
NO_RESTART=0
ALLOW_MERGE_PULL="${ALLOW_MERGE_PULL:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      enable_dry_run
      ;;
    --interactive)
      enable_interactive_sudo
      ;;
    --skip-git)
      SKIP_GIT=1
      ;;
    --skip-build)
      SKIP_BUILD=1
      ;;
    --no-restart)
      NO_RESTART=1
      ;;
    --allow-merge-pull)
      ALLOW_MERGE_PULL=1
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
      die "Unknown option: $1" "Run ./update.sh --help for usage."
      ;;
  esac
  shift
done

update_git() {
  run_cmd git fetch --all --prune
  if run_cmd git pull --ff-only; then
    return 0
  fi

  if [[ "${ALLOW_MERGE_PULL}" == "1" ]]; then
    log_warn "Fast-forward pull failed; running non-ff pull because ALLOW_MERGE_PULL=1."
    run_cmd git pull --no-rebase
    return 0
  fi

  die "Fast-forward pull failed." "Resolve branch divergence manually or re-run with --allow-merge-pull."
}

init_os
assert_repo_layout
init_runtime
require_cmd git

cd "${REPO_ROOT}"

echo "⚡ VidClaw Update"
print_runtime_summary

if [[ "${SKIP_GIT}" == "0" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    log_warn "Repository has local changes; update will continue, but git pull may fail or conflict. Commit/stash first if unsure."
  fi
  log_info "Fetching latest code..."
  update_git
else
  log_warn "Skipping git operations (--skip-git)."
fi

if [[ "${SKIP_BUILD}" == "0" ]]; then
  log_info "Installing dependencies..."
  npm_install_dependencies

  log_info "Building frontend..."
  npm_build
else
  log_warn "Skipping dependency install and build (--skip-build)."
fi

if [[ "${NO_RESTART}" == "1" ]]; then
  log_warn "Skipping service restart (--no-restart)."
else
  log_info "Restarting service in $(service_mode) mode..."
  restart_service
fi

echo
log_ok "Update complete."
log_info "Verify status with: ./status.sh"
log_info "View logs with: ./logs.sh"
