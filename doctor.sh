#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"
# shellcheck source=scripts/lib/service.sh
source "${SCRIPT_DIR}/scripts/lib/service.sh"

usage() {
  cat <<'HELP'
Usage: ./doctor.sh [options]

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
      die "Unknown option: $1" "Run ./doctor.sh --help for usage."
      ;;
  esac
  shift
done

FAILURES=0
WARNINGS=0

pass() {
  printf '[PASS] %s\n' "$1"
}

warn_diag() {
  printf '[WARN] %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}

fail_diag() {
  printf '[FAIL] %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

init_os
assert_repo_layout

echo "VidClaw Doctor"
log_info "OS: ${OS}"
log_info "Repo: ${REPO_ROOT}"
log_info "Shell: ${SHELL:-unknown}"

if command -v git >/dev/null 2>&1; then
  pass "git found: $(command -v git)"
else
  fail_diag "git not found"
fi

NODE_PATH=""
if NODE_PATH="$(find_node_bin 2>/dev/null)"; then
  pass "node found: ${NODE_PATH} ($("${NODE_PATH}" -v))"
else
  fail_diag "node not found"
fi

NPM_PATH=""
if [[ -n "${NODE_PATH}" ]] && NPM_PATH="$(find_npm_bin "${NODE_PATH}" 2>/dev/null)"; then
  pass "npm found: ${NPM_PATH} ($("${NPM_PATH}" -v))"
else
  fail_diag "npm not found"
fi

if [[ -n "${NODE_PATH}" ]]; then
  NODE_MAJOR="$("${NODE_PATH}" -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
  if [[ "${NODE_MAJOR}" =~ ^[0-9]+$ ]] && (( NODE_MAJOR >= REQUIRED_NODE_MAJOR )); then
    pass "Node major version is supported (${NODE_MAJOR})"
  else
    fail_diag "Node major version must be >= ${REQUIRED_NODE_MAJOR}"
  fi
fi

if [[ -f "${REPO_ROOT}/package-lock.json" ]]; then
  pass "package-lock.json present (scripts will use npm ci)"
else
  warn_diag "package-lock.json missing (scripts will use npm install)"
fi

if [[ "${REPO_ROOT}" == *" "* ]]; then
  warn_diag "Repository path contains spaces; scripts support this, but some external tools may not"
else
  pass "Repository path has no spaces"
fi

if mkdir -p "${DATA_DIR}" && [[ -w "${DATA_DIR}" ]]; then
  pass "Data directory is writable: ${DATA_DIR}"
else
  fail_diag "Data directory is not writable: ${DATA_DIR}"
fi

if port_in_use "${VIDCLAW_PORT}"; then
  warn_diag "Port ${VIDCLAW_PORT} is currently in use"
else
  pass "Port ${VIDCLAW_PORT} is free"
fi

MODE="$(service_mode)"
pass "Detected service mode: ${MODE}"

case "${MODE}" in
  systemd)
    if has_systemd; then
      pass "systemd is available"
    else
      fail_diag "systemd mode selected but systemd is unavailable"
    fi

    if [[ -f "${SYSTEMD_UNIT_PATH}" ]]; then
      pass "systemd unit exists: ${SYSTEMD_UNIT_PATH}"
    else
      warn_diag "systemd unit file not found: ${SYSTEMD_UNIT_PATH}"
    fi

    if systemctl is-active --quiet "${VIDCLAW_SERVICE_NAME}" 2>/dev/null; then
      pass "systemd service is active: ${VIDCLAW_SERVICE_NAME}"
    else
      warn_diag "systemd service is not active: ${VIDCLAW_SERVICE_NAME}"
    fi
    ;;
  launchd)
    if [[ -f "${LAUNCHD_PLIST_PATH}" ]]; then
      pass "launchd plist exists: ${LAUNCHD_PLIST_PATH}"
    else
      warn_diag "launchd plist not found: ${LAUNCHD_PLIST_PATH}"
    fi

    if launchctl print "$(launchd_label_ref)" >/dev/null 2>&1; then
      pass "LaunchAgent is loaded: ${VIDCLAW_LAUNCHD_LABEL}"
    else
      warn_diag "LaunchAgent is not loaded: ${VIDCLAW_LAUNCHD_LABEL}"
    fi
    ;;
  direct)
    if direct_is_running; then
      pass "Direct mode process running (PID $(direct_pid))"
    else
      warn_diag "Direct mode process not running"
    fi
    ;;
  none)
    warn_diag "No service manager detected (mode=none)"
    ;;
esac

SCRIPT_FILES=(
  "${REPO_ROOT}/setup.sh"
  "${REPO_ROOT}/update.sh"
  "${REPO_ROOT}/start.sh"
  "${REPO_ROOT}/stop.sh"
  "${REPO_ROOT}/status.sh"
  "${REPO_ROOT}/logs.sh"
  "${REPO_ROOT}/uninstall.sh"
  "${REPO_ROOT}/remove-service.sh"
  "${REPO_ROOT}/doctor.sh"
  "${REPO_ROOT}/scripts/lib/common.sh"
  "${REPO_ROOT}/scripts/lib/service.sh"
)

EXECUTABLE_SCRIPTS=(
  "${REPO_ROOT}/setup.sh"
  "${REPO_ROOT}/update.sh"
  "${REPO_ROOT}/start.sh"
  "${REPO_ROOT}/stop.sh"
  "${REPO_ROOT}/status.sh"
  "${REPO_ROOT}/logs.sh"
  "${REPO_ROOT}/uninstall.sh"
  "${REPO_ROOT}/remove-service.sh"
  "${REPO_ROOT}/doctor.sh"
)

MISSING_EXEC=0
for file in "${EXECUTABLE_SCRIPTS[@]}"; do
  if [[ ! -x "${file}" ]]; then
    warn_diag "Script is not executable: ${file}"
    MISSING_EXEC=1
  fi
done

if [[ "${MISSING_EXEC}" == "0" ]]; then
  pass "All command entrypoint scripts are executable"
fi

if LC_ALL=C grep -n $'\r$' "${SCRIPT_FILES[@]}" >/dev/null 2>&1; then
  warn_diag "Detected CRLF line endings in one or more shell scripts"
else
  pass "Shell scripts use LF line endings"
fi

CASE_CONFLICTS="$(find "${REPO_ROOT}/src" "${REPO_ROOT}/server" -type f | awk '{l=tolower($0)} seen[l] && seen[l] != $0 {print seen[l] " <-> " $0} {seen[l]=$0}')"
if [[ -n "${CASE_CONFLICTS}" ]]; then
  warn_diag "Case-insensitive filename conflicts detected:\n${CASE_CONFLICTS}"
else
  pass "No case-insensitive filename conflicts in src/ or server/"
fi

echo
if (( FAILURES > 0 )); then
  log_error "Doctor found ${FAILURES} failure(s) and ${WARNINGS} warning(s)."
  exit 1
fi

if (( WARNINGS > 0 )); then
  log_warn "Doctor completed with ${WARNINGS} warning(s)."
else
  log_ok "Doctor completed with no issues."
fi
