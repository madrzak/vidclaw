#!/usr/bin/env bash

# shellcheck shell=bash

if [[ "${VIDCLAW_COMMON_LIB_LOADED:-0}" == "1" ]]; then
  return 0
fi
VIDCLAW_COMMON_LIB_LOADED=1

COMMON_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${COMMON_LIB_DIR}/../.." && pwd)"
DATA_DIR="${REPO_ROOT}/data"

DRY_RUN="${DRY_RUN:-0}"
ALLOW_INTERACTIVE="${ALLOW_INTERACTIVE:-0}"
REQUIRED_NODE_MAJOR="${REQUIRED_NODE_MAJOR:-18}"
VIDCLAW_SERVICE_NAME="${VIDCLAW_SERVICE_NAME:-vidclaw}"
VIDCLAW_LAUNCHD_LABEL="${VIDCLAW_LAUNCHD_LABEL:-ai.vidclaw.dashboard}"
VIDCLAW_PORT="${VIDCLAW_PORT:-3333}"

NODE_BIN="${NODE_BIN:-}"
NPM_BIN="${NPM_BIN:-}"
OS="${OS:-}"

TAILSCALE_ENABLED="${TAILSCALE_ENABLED:-0}"
TAILSCALE_PORT="${TAILSCALE_PORT:-8443}"
TAILSCALE_BIN="${TAILSCALE_BIN:-}"

command_display() {
  local parts=()
  local arg
  for arg in "$@"; do
    parts+=("$(printf '%q' "$arg")")
  done
  printf '%s' "${parts[*]}"
}

log_info() {
  printf '[INFO] %s\n' "$*"
}

log_warn() {
  printf '[WARN] %s\n' "$*" >&2
}

log_error() {
  printf '[ERROR] %s\n' "$*" >&2
}

log_ok() {
  printf '[OK] %s\n' "$*"
}

die() {
  local code=1
  if [[ "${1:-}" == "--code" ]]; then
    [[ $# -ge 2 ]] || {
      log_error "Missing exit code after --code."
      exit 1
    }
    [[ "$2" =~ ^[0-9]+$ ]] || {
      log_error "Invalid exit code: $2"
      exit 1
    }
    code="$2"
    shift 2
  elif [[ $# -gt 0 && "$1" =~ ^[0-9]+$ ]]; then
    # Backward compatibility for callers using: die <code> <message> [hint]
    code="$1"
    shift
  fi
  local message="${1:-Unknown error}"
  local hint="${2:-}"
  log_error "$message"
  if [[ -n "$hint" ]]; then
    printf '[HINT] %s\n' "$hint" >&2
  fi
  exit "$code"
}

enable_dry_run() {
  DRY_RUN=1
}

enable_interactive_sudo() {
  ALLOW_INTERACTIVE=1
}

enable_tailscale() {
  TAILSCALE_ENABLED=1
}

is_dry_run() {
  [[ "${DRY_RUN}" == "1" ]]
}

run_cmd() {
  if is_dry_run; then
    log_info "[dry-run] $(command_display "$@")"
    return 0
  fi
  "$@"
}

run_cmd_quiet() {
  if is_dry_run; then
    log_info "[dry-run] $(command_display "$@")"
    return 0
  fi
  "$@" >/dev/null 2>&1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Missing required command: ${cmd}" "Install ${cmd} and re-run."
}

detect_os() {
  case "$(uname -s)" in
    Darwin) printf 'macos\n' ;;
    Linux) printf 'linux\n' ;;
    *) printf 'unknown\n' ;;
  esac
}

init_os() {
  OS="$(detect_os)"
  [[ "${OS}" != "unknown" ]] || die "Unsupported operating system: $(uname -s)" "VidClaw scripts support macOS and Linux."
}

is_macos() {
  [[ "${OS}" == "macos" ]]
}

is_linux() {
  [[ "${OS}" == "linux" ]]
}

is_root() {
  [[ "$(id -u)" -eq 0 ]]
}

run_sudo() {
  if is_root; then
    run_cmd "$@"
    return
  fi

  require_cmd sudo
  if [[ "${ALLOW_INTERACTIVE}" == "1" ]]; then
    run_cmd sudo "$@"
    return
  fi

  if is_dry_run; then
    log_info "[dry-run] $(command_display sudo -n "$@")"
    return
  fi

  sudo -n "$@" || die \
    "Sudo privileges are required: $(command_display "$@")" \
    "Re-run with ALLOW_INTERACTIVE=1 to allow sudo password prompts, or run as root."
}

assert_repo_layout() {
  [[ -f "${REPO_ROOT}/server.js" ]] || die "Could not find server.js in ${REPO_ROOT}" "Run this script from inside the VidClaw repository."
  [[ -f "${REPO_ROOT}/package.json" ]] || die "Could not find package.json in ${REPO_ROOT}" "Run this script from inside the VidClaw repository."
}

ensure_data_dir() {
  run_cmd mkdir -p "${DATA_DIR}"
}

find_node_bin() {
  local candidate
  if candidate="$(command -v node 2>/dev/null)"; then
    printf '%s\n' "$candidate"
    return 0
  fi
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

find_npm_bin() {
  local node_bin="${1:-}"
  local candidate
  if candidate="$(command -v npm 2>/dev/null)"; then
    printf '%s\n' "$candidate"
    return 0
  fi

  if [[ -n "${node_bin}" ]]; then
    candidate="$(cd "$(dirname "${node_bin}")" && pwd)/npm"
    if [[ -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  fi

  for candidate in /opt/homebrew/bin/npm /usr/local/bin/npm /usr/bin/npm; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

ensure_node_version() {
  local node_major
  node_major="$("${NODE_BIN}" -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
  [[ "${node_major}" =~ ^[0-9]+$ ]] || die "Unable to determine Node.js version from ${NODE_BIN}" "Check your Node.js installation."

  if (( node_major < REQUIRED_NODE_MAJOR )); then
    die "Node.js ${REQUIRED_NODE_MAJOR}+ is required (found ${node_major})." "Install a newer Node.js version and re-run."
  fi
}

init_runtime() {
  NODE_BIN="$(find_node_bin)" || die \
    "Node.js was not found in PATH or common install locations." \
    "Install Node.js ${REQUIRED_NODE_MAJOR}+ via package manager, nvm, asdf, or volta."
  NPM_BIN="$(find_npm_bin "${NODE_BIN}")" || die "npm was not found." "Install npm or ensure it is available in PATH."
  ensure_node_version
  export NODE_BIN NPM_BIN
}

is_tailscale_enabled() {
  [[ "${TAILSCALE_ENABLED}" == "1" ]]
}

find_tailscale_bin() {
  local candidate
  if candidate="$(command -v tailscale 2>/dev/null)"; then
    printf '%s\n' "$candidate"
    return 0
  fi
  for candidate in /usr/bin/tailscale /usr/local/bin/tailscale /opt/homebrew/bin/tailscale; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

init_tailscale() {
  is_tailscale_enabled || return 0
  TAILSCALE_BIN="$(find_tailscale_bin)" || die \
    "--tailscale requested but 'tailscale' was not found in PATH." \
    "Install Tailscale and re-run."
  export TAILSCALE_BIN
  log_info "Tailscale integration enabled (port ${TAILSCALE_PORT}, binary: ${TAILSCALE_BIN})"
}

tailscale_serve_cmd() {
  printf '%s serve --bg --https=%s http://127.0.0.1:%s' \
    "${TAILSCALE_BIN}" "${TAILSCALE_PORT}" "${VIDCLAW_PORT}"
}

npm_install_dependencies() {
  if [[ -f "${REPO_ROOT}/package-lock.json" ]]; then
    run_cmd "${NPM_BIN}" ci
  else
    run_cmd "${NPM_BIN}" install --production=false
  fi
}

npm_build() {
  run_cmd "${NPM_BIN}" run build
}

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :${port} )" 2>/dev/null | awk 'NR>1 {found=1} END {exit found?0:1}' && return 0
  fi

  if command -v netstat >/dev/null 2>&1; then
    netstat -an 2>/dev/null | grep -E "[\\.:]${port}[[:space:]].*LISTEN" >/dev/null && return 0
  fi

  return 1
}

print_runtime_summary() {
  log_info "OS: ${OS}"
  log_info "Repo: ${REPO_ROOT}"
  log_info "Node: ${NODE_BIN} ($("${NODE_BIN}" -v))"
  log_info "npm: ${NPM_BIN} ($("${NPM_BIN}" -v))"
}
