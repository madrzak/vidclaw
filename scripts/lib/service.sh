#!/usr/bin/env bash

# shellcheck shell=bash

if [[ "${VIDCLAW_SERVICE_LIB_LOADED:-0}" == "1" ]]; then
  return 0
fi
VIDCLAW_SERVICE_LIB_LOADED=1

: "${REPO_ROOT:?common.sh must be sourced before service.sh}"

SERVICE_MODE="${VIDCLAW_SERVICE_MODE:-auto}"
SYSTEMD_UNIT_PATH="/etc/systemd/system/${VIDCLAW_SERVICE_NAME}.service"
LAUNCHD_PLIST_DIR="${HOME}/Library/LaunchAgents"
LAUNCHD_PLIST_PATH="${LAUNCHD_PLIST_DIR}/${VIDCLAW_LAUNCHD_LABEL}.plist"
LAUNCHD_STDOUT_LOG="${DATA_DIR}/vidclaw.out.log"
LAUNCHD_STDERR_LOG="${DATA_DIR}/vidclaw.err.log"
DIRECT_PID_FILE="${DATA_DIR}/vidclaw.pid"
DIRECT_STDOUT_LOG="${DATA_DIR}/vidclaw.direct.out.log"
DIRECT_STDERR_LOG="${DATA_DIR}/vidclaw.direct.err.log"

ensure_node_for_service() {
  if [[ -n "${NODE_BIN:-}" && -x "${NODE_BIN}" ]]; then
    return 0
  fi
  NODE_BIN="$(find_node_bin)" || die "Node.js was not found; cannot manage service." "Install Node.js and run again."
  export NODE_BIN
}

launchd_domain() {
  printf 'gui/%s\n' "$(id -u)"
}

has_systemd() {
  command -v systemctl >/dev/null 2>&1 || return 1
  [[ -d /run/systemd/system ]] && return 0
  systemctl list-unit-files >/dev/null 2>&1
}

is_valid_service_mode() {
  case "${1:-}" in
    auto|systemd|launchd|direct|none)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

set_service_mode() {
  local mode="${1:-}"
  is_valid_service_mode "${mode}" || die \
    "Invalid --service-mode value: ${mode}" \
    "Use one of: auto, systemd, launchd, direct, none."
  SERVICE_MODE="${mode}"
}

service_mode() {
  case "${SERVICE_MODE}" in
    systemd|launchd|direct|none)
      printf '%s\n' "${SERVICE_MODE}"
      return 0
      ;;
    auto)
      if is_linux && has_systemd; then
        printf 'systemd\n'
        return 0
      fi
      if is_macos; then
        printf 'launchd\n'
        return 0
      fi
      if is_linux; then
        printf 'direct\n'
        return 0
      fi
      printf 'none\n'
      return 0
      ;;
    *)
      die "Unsupported VIDCLAW_SERVICE_MODE value: ${SERVICE_MODE}" \
        "Use one of: auto, systemd, launchd, direct, none."
      ;;
  esac
}

systemd_escape_exec_arg() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value// /\\x20}"
  value="${value//$'\t'/\\x09}"
  value="${value//%/%%}"
  printf '%s\n' "${value}"
}

systemd_default_path() {
  printf '%s\n' '/usr/local/bin:/usr/bin:/bin'
}

write_systemd_unit_file() {
  local tmp_file="$1"
  local escaped_node escaped_entrypoint
  escaped_node="$(systemd_escape_exec_arg "${NODE_BIN}")"
  escaped_entrypoint="$(systemd_escape_exec_arg "${REPO_ROOT}/server.js")"
  cat > "${tmp_file}" <<EOF
[Unit]
Description=VidClaw Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${REPO_ROOT}
ExecStart=${escaped_node} ${escaped_entrypoint}
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=${VIDCLAW_PORT}
Environment=PATH=$(systemd_default_path)

[Install]
WantedBy=multi-user.target
EOF
}

install_systemd_service() {
  has_systemd || die "systemd is not available on this Linux host." "Set VIDCLAW_SERVICE_MODE=direct to run without systemd."
  ensure_node_for_service

  if is_dry_run; then
    log_info "[dry-run] would write systemd unit to ${SYSTEMD_UNIT_PATH}"
  else
    local tmp_file
    tmp_file="$(mktemp)"
    write_systemd_unit_file "${tmp_file}"
    run_sudo install -m 0644 "${tmp_file}" "${SYSTEMD_UNIT_PATH}"
    rm -f "${tmp_file}"
  fi

  run_sudo systemctl daemon-reload
  run_sudo systemctl enable --now "${VIDCLAW_SERVICE_NAME}"
  log_ok "systemd service installed and started: ${VIDCLAW_SERVICE_NAME}"
}

write_launchd_plist() {
  local plist_path="$1"
  cat > "${plist_path}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${VIDCLAW_LAUNCHD_LABEL}</string>

    <key>WorkingDirectory</key>
    <string>${REPO_ROOT}</string>

    <key>ProgramArguments</key>
    <array>
      <string>${NODE_BIN}</string>
      <string>${REPO_ROOT}/server.js</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
      <key>NODE_ENV</key>
      <string>production</string>
      <key>PORT</key>
      <string>${VIDCLAW_PORT}</string>
      <key>PATH</key>
      <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>${LAUNCHD_STDOUT_LOG}</string>
    <key>StandardErrorPath</key>
    <string>${LAUNCHD_STDERR_LOG}</string>
  </dict>
</plist>
EOF
}

launchd_label_ref() {
  local domain
  domain="$(launchd_domain)"
  printf '%s/%s\n' "${domain}" "${VIDCLAW_LAUNCHD_LABEL}"
}

launchd_is_loaded() {
  local ref
  ref="$(launchd_label_ref)"
  if is_dry_run; then
    return 1
  fi
  launchctl print "${ref}" >/dev/null 2>&1
}

load_launchd_service_if_needed() {
  local domain ref
  domain="$(launchd_domain)"
  ref="$(launchd_label_ref)"

  if is_dry_run; then
    log_info "[dry-run] would ensure LaunchAgent is loaded from ${LAUNCHD_PLIST_PATH}"
    return 0
  fi

  launchd_is_loaded && return 0

  [[ -f "${LAUNCHD_PLIST_PATH}" ]] || die \
    "LaunchAgent plist was not found at ${LAUNCHD_PLIST_PATH}." \
    "Run ./setup.sh first to install the service."

  run_cmd launchctl bootstrap "${domain}" "${LAUNCHD_PLIST_PATH}"
  run_cmd_quiet launchctl enable "${ref}" || true
}

install_launchd_service() {
  ensure_node_for_service
  ensure_data_dir
  run_cmd mkdir -p "${LAUNCHD_PLIST_DIR}"

  if is_dry_run; then
    log_info "[dry-run] would write LaunchAgent plist to ${LAUNCHD_PLIST_PATH}"
  else
    write_launchd_plist "${LAUNCHD_PLIST_PATH}"
  fi

  local domain ref
  domain="$(launchd_domain)"
  ref="$(launchd_label_ref)"
  run_cmd_quiet launchctl bootout "${domain}" "${LAUNCHD_PLIST_PATH}" || true
  run_cmd launchctl bootstrap "${domain}" "${LAUNCHD_PLIST_PATH}"
  run_cmd_quiet launchctl enable "${ref}" || true
  run_cmd_quiet launchctl kickstart -k "${ref}" || true
  log_ok "launchd LaunchAgent installed and started: ${VIDCLAW_LAUNCHD_LABEL}"
}

direct_pid() {
  [[ -f "${DIRECT_PID_FILE}" ]] || return 1
  local pid
  pid="$(cat "${DIRECT_PID_FILE}" 2>/dev/null || true)"
  [[ "${pid}" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "${pid}"
}

direct_pid_matches_process() {
  local pid="$1"
  if ! command -v ps >/dev/null 2>&1; then
    return 0
  fi

  local command
  command="$(ps -p "${pid}" -o args= 2>/dev/null || true)"
  [[ -n "${command}" ]] || return 1
  [[ "${command}" == *"${REPO_ROOT}/server.js"* ]]
}

direct_running_pid() {
  local pid
  pid="$(direct_pid)" || return 1
  kill -0 "${pid}" >/dev/null 2>&1 || return 1
  direct_pid_matches_process "${pid}" || return 1
  printf '%s\n' "${pid}"
}

direct_is_running() {
  direct_running_pid >/dev/null
}

start_direct_service() {
  ensure_node_for_service
  ensure_data_dir
  local pid
  if direct_is_running; then
    log_info "Direct process mode already running with PID $(direct_running_pid)."
    return 0
  fi

  if pid="$(direct_pid)"; then
    log_warn "Removing stale direct-mode PID file (${DIRECT_PID_FILE}, PID ${pid})."
    run_cmd rm -f "${DIRECT_PID_FILE}"
  fi

  if is_dry_run; then
    log_info "[dry-run] would start direct process with nohup"
    return 0
  fi

  nohup "${NODE_BIN}" "${REPO_ROOT}/server.js" >>"${DIRECT_STDOUT_LOG}" 2>>"${DIRECT_STDERR_LOG}" &
  pid="$!"
  echo "${pid}" > "${DIRECT_PID_FILE}"

  sleep 1
  if direct_is_running; then
    log_ok "Direct process started with PID $(direct_running_pid)."
    return 0
  fi

  die "Direct process failed to start." "Check ${DIRECT_STDERR_LOG} for details."
}

stop_direct_service() {
  local pid
  pid="$(direct_pid)" || {
    log_info "Direct process mode is not running."
    run_cmd rm -f "${DIRECT_PID_FILE}"
    return 0
  }

  if ! pid="$(direct_running_pid)"; then
    log_warn "PID file exists but process is not a VidClaw direct-mode server; removing stale PID file."
    run_cmd rm -f "${DIRECT_PID_FILE}"
    return 0
  fi

  if is_dry_run; then
    log_info "[dry-run] $(command_display kill "${pid}")"
    return 0
  fi

  kill "${pid}" >/dev/null 2>&1 || true
  local attempt
  for attempt in 1 2 3 4 5; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi

  rm -f "${DIRECT_PID_FILE}"
  log_ok "Direct process stopped."
}

status_direct_service() {
  local pid
  if direct_is_running; then
    pid="$(direct_running_pid)"
    log_ok "Direct process running (PID ${pid})."
    return 0
  fi

  log_warn "Direct process not running."
  return 1
}

logs_direct_service() {
  local lines="${1:-200}"
  local follow="${2:-1}"
  ensure_data_dir

  local files=()
  [[ -f "${DIRECT_STDOUT_LOG}" ]] && files+=("${DIRECT_STDOUT_LOG}")
  [[ -f "${DIRECT_STDERR_LOG}" ]] && files+=("${DIRECT_STDERR_LOG}")

  if [[ "${#files[@]}" -eq 0 ]]; then
    log_warn "No direct process log files found yet."
    return 0
  fi

  if [[ "${follow}" == "1" ]]; then
    run_cmd tail -n "${lines}" -f "${files[@]}"
  else
    run_cmd tail -n "${lines}" "${files[@]}"
  fi
}

install_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd) install_systemd_service ;;
    launchd) install_launchd_service ;;
    direct)
      log_warn "No supported system service manager detected; using direct process mode."
      start_direct_service
      ;;
    none)
      log_warn "No service manager available for this environment. Start manually with ./start.sh."
      ;;
  esac
}

start_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      run_sudo systemctl start "${VIDCLAW_SERVICE_NAME}"
      ;;
    launchd)
      load_launchd_service_if_needed
      run_cmd_quiet launchctl kickstart -k "$(launchd_label_ref)" || true
      ;;
    direct)
      start_direct_service
      ;;
    none)
      die "No service mode available." "Set VIDCLAW_SERVICE_MODE=direct and retry."
      ;;
  esac
}

stop_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      run_sudo systemctl stop "${VIDCLAW_SERVICE_NAME}"
      ;;
    launchd)
      if [[ -f "${LAUNCHD_PLIST_PATH}" ]]; then
        run_cmd_quiet launchctl bootout "$(launchd_domain)" "${LAUNCHD_PLIST_PATH}" || true
      else
        log_info "LaunchAgent plist does not exist; nothing to stop."
      fi
      ;;
    direct)
      stop_direct_service
      ;;
    none)
      log_info "No service mode configured; nothing to stop."
      ;;
  esac
}

restart_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      run_sudo systemctl restart "${VIDCLAW_SERVICE_NAME}"
      ;;
    launchd)
      load_launchd_service_if_needed
      run_cmd_quiet launchctl kickstart -k "$(launchd_label_ref)" || true
      ;;
    direct)
      stop_direct_service
      start_direct_service
      ;;
    none)
      die "No service mode configured." "Set VIDCLAW_SERVICE_MODE=direct and retry."
      ;;
  esac
}

status_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      if is_dry_run; then
        log_info "[dry-run] $(command_display systemctl status --no-pager --full "${VIDCLAW_SERVICE_NAME}")"
        return 0
      fi
      if systemctl status --no-pager --full "${VIDCLAW_SERVICE_NAME}"; then
        return 0
      fi
      log_warn "systemctl status failed without sudo; retrying with sudo."
      run_sudo systemctl status --no-pager --full "${VIDCLAW_SERVICE_NAME}"
      ;;
    launchd)
      if is_dry_run; then
        log_info "[dry-run] $(command_display launchctl print "$(launchd_label_ref)")"
        return 0
      fi
      if launchctl print "$(launchd_label_ref)" >/dev/null 2>&1; then
        launchctl print "$(launchd_label_ref)" | awk '/state =/ || /pid =/'
        return 0
      fi
      log_warn "LaunchAgent is not loaded."
      return 1
      ;;
    direct)
      status_direct_service
      ;;
    none)
      log_warn "No service mode configured."
      return 1
      ;;
  esac
}

logs_service() {
  local lines="${1:-200}"
  local follow="${2:-1}"
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      local args=(-u "${VIDCLAW_SERVICE_NAME}" -n "${lines}" --no-pager)
      [[ "${follow}" == "1" ]] && args+=(-f)
      if is_dry_run; then
        log_info "[dry-run] $(command_display journalctl "${args[@]}")"
        return 0
      fi
      if journalctl "${args[@]}"; then
        return 0
      fi
      log_warn "journalctl access failed without sudo; retrying with sudo."
      run_sudo journalctl "${args[@]}"
      ;;
    launchd)
      local files=()
      [[ -f "${LAUNCHD_STDOUT_LOG}" ]] && files+=("${LAUNCHD_STDOUT_LOG}")
      [[ -f "${LAUNCHD_STDERR_LOG}" ]] && files+=("${LAUNCHD_STDERR_LOG}")
      if [[ "${#files[@]}" -eq 0 ]]; then
        log_warn "No launchd logs found yet."
        return 0
      fi
      if [[ "${follow}" == "1" ]]; then
        run_cmd tail -n "${lines}" -f "${files[@]}"
      else
        run_cmd tail -n "${lines}" "${files[@]}"
      fi
      ;;
    direct)
      logs_direct_service "${lines}" "${follow}"
      ;;
    none)
      log_warn "No service mode configured."
      return 1
      ;;
  esac
}

uninstall_service() {
  local mode
  mode="$(service_mode)"
  case "${mode}" in
    systemd)
      run_sudo systemctl disable --now "${VIDCLAW_SERVICE_NAME}" || true
      run_sudo rm -f "${SYSTEMD_UNIT_PATH}"
      run_sudo systemctl daemon-reload
      run_sudo systemctl reset-failed "${VIDCLAW_SERVICE_NAME}" || true
      log_ok "systemd service removed: ${VIDCLAW_SERVICE_NAME}"
      ;;
    launchd)
      run_cmd_quiet launchctl bootout "$(launchd_domain)" "${LAUNCHD_PLIST_PATH}" || true
      run_cmd rm -f "${LAUNCHD_PLIST_PATH}"
      log_ok "launchd LaunchAgent removed: ${VIDCLAW_LAUNCHD_LABEL}"
      ;;
    direct)
      stop_direct_service
      log_ok "Direct process mode cleaned up."
      ;;
    none)
      log_info "No service mode configured; nothing to uninstall."
      ;;
  esac
}
