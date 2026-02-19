#!/usr/bin/env bash
# VidClaw — one-liner installer
# curl -fsSL vidclaw.com/install.sh | bash
# curl -fsSL vidclaw.com/install.sh | bash -s -- --no-tailscale
set -euo pipefail

INSTALL_DIR="${VIDCLAW_DIR:-${HOME}/.openclaw/workspace/dashboard}"
REPO_URL="https://github.com/madrzak/vidclaw.git"
TAILSCALE_FLAG=1
TAILSCALE_CONNECTED=0
SETUP_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-tailscale)   TAILSCALE_FLAG=0 ;;
    --tailscale)      TAILSCALE_FLAG=1; [[ "${2:-}" =~ ^[0-9]+$ ]] && { SETUP_ARGS+=("--tailscale" "$2"); shift; } ;;
    --skip-service|--skip-heartbeat|--dry-run|--interactive) SETUP_ARGS+=("$1") ;;
    --service-mode)   SETUP_ARGS+=("$1" "$2"); shift ;;
    *)                SETUP_ARGS+=("$1") ;;
  esac
  shift
done

[[ "${TAILSCALE_FLAG}" == "1" ]] && SETUP_ARGS+=("--tailscale")

# ---------- output ----------
BOLD='\033[1m'  DIM='\033[2m'  GREEN='\033[32m'  YELLOW='\033[33m'  RED='\033[31m'  CYAN='\033[36m'  RESET='\033[0m'

step()  { echo -e "${CYAN}▸${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}!${RESET} $*"; }
fail()  { echo -e "${RED}✗${RESET} $*" >&2; exit 1; }
quiet() { "$@" > /dev/null 2>&1; }
has()   { command -v "$1" > /dev/null 2>&1; }

# ---------- banner ----------
echo
echo -e "${BOLD}  ⚡ VidClaw Installer${RESET}"
echo -e "${DIM}  ─────────────────────${RESET}"
echo

# ---------- prereqs ----------
step "Checking prerequisites..."

# Node.js
if ! has node; then
  step "Installing Node.js 22..."
  if has apt-get; then
    curl -fsSL https://deb.nodesource.com/setup_22.x 2>/dev/null | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs > /dev/null 2>&1
  elif has dnf; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x 2>/dev/null | sudo bash - > /dev/null 2>&1
    sudo dnf install -y nodejs > /dev/null 2>&1
  elif has brew; then
    brew install node@22 > /dev/null 2>&1
  else
    fail "Cannot auto-install Node.js. Install Node.js 18+ and re-run."
  fi
fi
NODE_V="$(node -v | sed 's/v//' | cut -d. -f1)"
[[ "${NODE_V}" -lt 18 ]] && fail "Node.js 18+ required (found v${NODE_V})"
has npm || fail "npm not found"
ok "Node $(node -v) + npm $(npm -v)"

# git
if ! has git; then
  step "Installing git..."
  if has apt-get; then sudo apt-get install -y git > /dev/null 2>&1
  elif has dnf; then sudo dnf install -y git > /dev/null 2>&1
  elif has brew; then brew install git > /dev/null 2>&1
  else fail "Cannot auto-install git."
  fi
fi
ok "git $(git --version | awk '{print $3}')"

# Tailscale
if [[ "${TAILSCALE_FLAG}" == "1" ]]; then
  if ! has tailscale; then
    step "Installing Tailscale..."
    if [[ "$(uname)" == "Linux" ]]; then
      curl -fsSL https://tailscale.com/install.sh 2>/dev/null | sh > /dev/null 2>&1
    elif [[ "$(uname)" == "Darwin" ]] && has brew; then
      brew install --cask tailscale > /dev/null 2>&1
    else
      fail "Install Tailscale from https://tailscale.com/download and re-run."
    fi
    has tailscale || fail "Tailscale install failed."
  fi

  if tailscale status > /dev/null 2>&1; then
    TAILSCALE_CONNECTED=1
    ok "Tailscale $(tailscale version 2>/dev/null | head -1) — connected"
  else
    ok "Tailscale $(tailscale version 2>/dev/null | head -1) — installed"
    # Don't pass --tailscale to setup if not connected
    filtered=()
    for arg in "${SETUP_ARGS[@]}"; do
      [[ "$arg" != "--tailscale" ]] && filtered+=("$arg")
    done
    SETUP_ARGS=("${filtered[@]+"${filtered[@]}"}")
  fi
fi

echo

# ---------- install ----------
if [[ -d "${INSTALL_DIR}/.git" ]]; then
  step "Updating VidClaw..."
  cd "${INSTALL_DIR}"
  git pull --ff-only -q 2>/dev/null || warn "git pull failed — using existing code"
else
  step "Cloning VidClaw..."
  mkdir -p "$(dirname "${INSTALL_DIR}")"
  git clone -q "${REPO_URL}" "${INSTALL_DIR}"
  cd "${INSTALL_DIR}"
fi

step "Running setup..."
echo
chmod +x setup.sh
./setup.sh "${SETUP_ARGS[@]}"

# ---------- done ----------
echo
echo -e "${BOLD}${GREEN}  ⚡ VidClaw is ready${RESET}"
echo
echo -e "  ${DIM}Dashboard${RESET}  http://localhost:${VIDCLAW_PORT:-3333}"
echo -e "  ${DIM}Directory${RESET}  ${INSTALL_DIR}"
echo -e "  ${DIM}Commands${RESET}   ./start.sh  ./stop.sh  ./status.sh  ./logs.sh"

if [[ "${TAILSCALE_FLAG}" == "1" ]] && [[ "${TAILSCALE_CONNECTED}" == "0" ]]; then
  echo
  echo -e "  ${YELLOW}▸ Remote access:${RESET} Tailscale needs authentication"
  echo -e "    ${DIM}1.${RESET} sudo tailscale up"
  echo -e "    ${DIM}2.${RESET} cd ${INSTALL_DIR} && ./setup.sh --tailscale"
fi

echo
