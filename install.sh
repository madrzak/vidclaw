#!/usr/bin/env bash
# VidClaw one-liner installer
# Usage: curl -fsSL vidclaw.com/install.sh | bash
#   Without Tailscale: curl -fsSL vidclaw.com/install.sh | bash -s -- --no-tailscale
#   Custom port:       curl -fsSL vidclaw.com/install.sh | bash -s -- --tailscale 9443
#   Custom dir:        VIDCLAW_DIR=/path/to/dir curl -fsSL vidclaw.com/install.sh | bash
set -euo pipefail

# ---------- config ----------
INSTALL_DIR="${VIDCLAW_DIR:-${HOME}/.openclaw/workspace/dashboard}"
REPO_URL="https://github.com/madrzak/vidclaw.git"
TAILSCALE_FLAG=1
SETUP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-tailscale)
      TAILSCALE_FLAG=0
      ;;
    --tailscale)
      TAILSCALE_FLAG=1
      if [[ "${2:-}" =~ ^[0-9]+$ ]]; then
        SETUP_ARGS+=("--tailscale" "$2")
        shift
      fi
      ;;
    --skip-service|--skip-heartbeat|--dry-run|--interactive)
      SETUP_ARGS+=("$1")
      ;;
    --service-mode)
      SETUP_ARGS+=("$1" "$2")
      shift
      ;;
    *)
      echo "[WARN] Unknown option: $1 (passing through to setup.sh)"
      SETUP_ARGS+=("$1")
      ;;
  esac
  shift
done

# Add tailscale flag to setup args if enabled
if [[ "${TAILSCALE_FLAG}" == "1" ]]; then
  SETUP_ARGS+=("--tailscale")
fi

# ---------- helpers ----------
info()  { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[OK]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[WARN]\033[0m $*"; }
die()   { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; exit 1; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# ---------- prereqs ----------
info "Checking prerequisites..."

# Node.js
if ! command_exists node; then
  info "Node.js not found. Installing via NodeSource..."
  if command_exists apt-get; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command_exists dnf; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
    sudo dnf install -y nodejs
  elif command_exists brew; then
    brew install node@22
  else
    die "Cannot auto-install Node.js. Install Node.js 18+ manually and re-run."
  fi
fi

NODE_VERSION="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "${NODE_VERSION}" -lt 18 ]]; then
  die "Node.js 18+ required (found v${NODE_VERSION}). Upgrade and re-run."
fi
ok "Node.js $(node -v)"

# npm
command_exists npm || die "npm not found. Install npm and re-run."
ok "npm $(npm -v)"

# git
if ! command_exists git; then
  info "git not found. Installing..."
  if command_exists apt-get; then
    sudo apt-get install -y git
  elif command_exists dnf; then
    sudo dnf install -y git
  elif command_exists brew; then
    brew install git
  else
    die "Cannot auto-install git. Install git manually and re-run."
  fi
fi
ok "git $(git --version | awk '{print $3}')"

# Tailscale (if requested)
if [[ "${TAILSCALE_FLAG}" == "1" ]]; then
  if ! command_exists tailscale; then
    info "Tailscale not found. Installing..."
    if [[ "$(uname)" == "Linux" ]]; then
      curl -fsSL https://tailscale.com/install.sh | sh
    elif [[ "$(uname)" == "Darwin" ]]; then
      if command_exists brew; then
        brew install --cask tailscale
      else
        die "Install Tailscale from https://tailscale.com/download and re-run."
      fi
    else
      die "Install Tailscale from https://tailscale.com/download and re-run."
    fi

    if ! command_exists tailscale; then
      die "Tailscale installed but not in PATH. You may need to restart your shell."
    fi
  fi

  # Check if Tailscale is connected
  if ! tailscale status >/dev/null 2>&1; then
    warn "Tailscale is installed but not connected."
    info "Run 'sudo tailscale up' to authenticate, then re-run this installer."
    die "Tailscale not connected."
  fi

  ok "Tailscale $(tailscale version 2>/dev/null | head -1 || echo 'installed')"
fi

# ---------- clone / update ----------
if [[ -d "${INSTALL_DIR}/.git" ]]; then
  info "Existing installation found at ${INSTALL_DIR}. Pulling latest..."
  cd "${INSTALL_DIR}"
  git pull --ff-only || warn "git pull failed — continuing with existing code"
else
  info "Cloning VidClaw to ${INSTALL_DIR}..."
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone "${REPO_URL}" "${INSTALL_DIR}"
  cd "${INSTALL_DIR}"
fi

# ---------- run setup ----------
info "Running setup..."
chmod +x setup.sh
./setup.sh "${SETUP_ARGS[@]}"

echo
ok "VidClaw installed successfully."
echo
echo "  Directory: ${INSTALL_DIR}"
echo "  Commands:  ./start.sh  ./stop.sh  ./status.sh  ./logs.sh"
echo
echo "  One-liner to update later:"
echo "    cd ${INSTALL_DIR} && git pull && ./setup.sh ${SETUP_ARGS[*]:-}"
echo
