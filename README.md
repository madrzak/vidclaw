# VidClaw

A secure, self-hosted command center for managing your OpenClaw AI agent.

![Dark theme dashboard with Kanban board, usage tracking, and more](https://img.shields.io/badge/status-beta-orange)

## Features

- **🗂️ Kanban Task Board** — Backlog → Todo → In Progress → Done. Drag & drop, priorities, skill assignment. Your agent picks up tasks automatically via heartbeat or cron.
- **📊 Usage Tracking** — Real-time token usage and cost estimates parsed from session transcripts. Progress bars matching Anthropic's rate limit windows.
- **🔄 Model Switching** — Switch between Claude models directly from the dashboard. Hot-reloads via OpenClaw's config watcher.
- **📅 Activity Calendar** — Monthly view of agent activity, parsed from memory files and task history.
- **📁 Content Browser** — Browse workspace files with markdown preview, syntax highlighting, and download.
- **🧩 Skills Manager** — View all bundled/workspace skills, enable/disable them, create custom skills.
- **💜 Soul Editor** — Edit SOUL.md, IDENTITY.md, USER.md, AGENTS.md with version history and persona templates.
- **⚡ Task Execution** — Tasks execute automatically via cron (every 2 min) or heartbeat (every 30 min). Hit "Run Now" for immediate execution.

## Security Model

VidClaw binds to localhost by default (`127.0.0.1:3333`). For remote hosts, use an SSH tunnel:

```bash
ssh -L 3333:localhost:3333 <user>@<server-host>
```

Then open `http://localhost:3333`.

You can override the bind address with `HOST` (for example `HOST=0.0.0.0`), but that exposes the dashboard on your network interfaces. Only use non-localhost binds when you explicitly control network access (firewall, private subnet, reverse proxy auth).

### Tailscale (Alternative to SSH)

If you use [Tailscale](https://tailscale.com) for remote access (which is OpenClaw's recommended method), you can expose VidClaw via Tailscale Serve:

```bash
tailscale serve --bg --https=8443 http://127.0.0.1:3333
```

Then access it at `https://your-machine.your-tailnet.ts.net:8443/`.

> **⚠️ OpenClaw `resetOnExit` gotcha:** If your OpenClaw gateway config has `tailscale.resetOnExit: true`, the gateway tears down **all** Tailscale Serve rules when it stops — not just its own. This means every gateway restart (updates, crashes, watchdog recovery) will silently kill VidClaw's Tailscale route.
>
> **Fix:** Ensure VidClaw re-registers its Tailscale Serve route on startup. If using systemd, add `ExecStartPre=-/usr/bin/tailscale serve --bg --https=8443 http://127.0.0.1:3333` to the service file. If using launchd on macOS, use a wrapper script that runs the `tailscale serve` command before starting the node server.

## Prerequisites

- OpenClaw installed and running
- Node.js `>=18` and npm `>=9`
- Git

Check your environment quickly:

```bash
./doctor.sh
```

## Install

```bash
cd ~/.openclaw/workspace
git clone https://github.com/madrzak/vidclaw.git dashboard
cd dashboard
./setup.sh

# Or with Tailscale Serve integration (optional, default port 8443)
./setup.sh --tailscale
./setup.sh --tailscale 9443  # custom port
```

When `--tailscale` is passed, the service is configured to register its Tailscale Serve route on every start, so the route survives OpenClaw gateway restarts with `resetOnExit: true`.

`setup.sh` is idempotent: safe to re-run.

### macOS Notes

- Default service mode is a per-user LaunchAgent (`~/Library/LaunchAgents/ai.vidclaw.dashboard.plist`).
- Homebrew Node path (`/opt/homebrew/bin`) is supported automatically.
- Install Node with:

```bash
brew install node
```

Optional root LaunchDaemon mode (advanced):
1. Copy the generated plist to `/Library/LaunchDaemons/`.
2. Set correct owner/permissions (`root:wheel`, `644`).
3. Add a `UserName` key in the plist for the runtime user.
4. Load with `sudo launchctl bootstrap system /Library/LaunchDaemons/<label>.plist`.

### Linux Notes

- Default service mode is `systemd` when available.
- If systemd is unavailable, scripts fall back to direct process mode.
- Install Node with your distro package manager (apt/yum/dnf/pacman) or nvm.

## Run / Operate

Portable wrappers:

```bash
./start.sh
./stop.sh
./status.sh
./logs.sh
```

Development mode:

```bash
./start.sh --dev
```

This starts backend + Vite for local development.

### Service Backends

- `auto` (default): `launchd` on macOS, `systemd` on Linux when available.
- `direct`: no service manager; starts/stops a managed background process with PID/log files in `data/`.
- Override per command with `--service-mode ...` or globally with `VIDCLAW_SERVICE_MODE=...`.

## Update

```bash
./update.sh
```

Behavior:
- `git fetch --all --prune`
- `git pull --ff-only` (safe default)
- `npm ci` (or `npm install` if no lockfile)
- `npm run build`
- service restart

If branch history diverged and you intentionally want a merge pull:

```bash
./update.sh --allow-merge-pull
```

## Uninstall

Remove service wiring only:

```bash
./uninstall.sh
```

Remove service + runtime data:

```bash
./uninstall.sh --purge-data
```

`./remove-service.sh` is an alias of `./uninstall.sh`.

## Advanced Flags

All operational scripts support:

- `--dry-run` or `DRY_RUN=1`: preview actions without changes
- `--interactive` or `ALLOW_INTERACTIVE=1`: allow sudo password prompts
- `--service-mode auto|systemd|launchd|direct|none`: override service backend

## Troubleshooting

- Permission errors writing `/etc/systemd/system/*.service`:
  - Re-run with `ALLOW_INTERACTIVE=1` or run as root.
- Port `3333` already in use:
  - Stop the conflicting process, or set `PORT` and restart.
- LaunchAgent not loaded on macOS:
  - Check `./status.sh` and inspect logs with `./logs.sh`.
- Node/npm not found in non-login shells:
  - Run `./doctor.sh`; ensure your package manager or version manager exports PATH for non-interactive shells.

## Case-Sensitivity Guidance

Some macOS filesystems are case-insensitive while Linux is typically case-sensitive. Keep import path casing exact and avoid creating files that differ only by letter case.

## API

See [API.md](API.md) for endpoint reference.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Express.js
- Data store: JSON files

## License

MIT

---

Copyright (c) 2026 [woocassh](https://x.com/woocassh) · [GitHub](https://github.com/madrzak/vidclaw) · MIT License
