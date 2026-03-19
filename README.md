# VidClaw

A secure, self-hosted command center for managing your OpenClaw AI agent.

![Dark theme dashboard with Kanban board, usage tracking, and more](https://img.shields.io/badge/status-beta-orange) ![build](https://img.shields.io/badge/build-passing-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **🗂️ Kanban Task Board** — Backlog → Todo → In Progress → Done. Drag & drop, priorities, skill assignment. Your agent picks up tasks automatically via heartbeat or cron.
- **📊 Usage Tracking** — Real-time token usage and cost estimates parsed from session transcripts. Progress bars matching Anthropic's rate limit windows.
- **🔄 Model Switching** — Switch between Claude models directly from the dashboard. Hot-reloads via OpenClaw's config watcher.
- **📅 Activity Calendar** — Monthly view of agent activity, parsed from memory files and task history.
- **📁 Content Browser** — Browse workspace files with markdown preview, syntax highlighting, and download.
- **🧩 Skills Manager** — View all bundled/workspace skills, enable/disable them, create custom skills.
- **💜 Soul Editor** — Edit SOUL.md, IDENTITY.md, USER.md, AGENTS.md with version history and persona templates.
- **⚡ Task Execution** — Tasks execute automatically via cron (every 2 min) or heartbeat (every 30 min). Hit "Run Now" for immediate execution.

## Security

VidClaw binds to localhost only (`127.0.0.1:3333`) — no external network calls, all data stays on your machine.

Remote access is handled via **Tailscale Serve** (enabled by default on port 8443). Alternatively, use an SSH tunnel: `ssh -L 3333:localhost:3333 <user>@<server>`.

Then open `https://your-machine.your-tailnet.ts.net:8443` (Tailscale) or `http://localhost:3333` (SSH).

## Prerequisites

- OpenClaw installed and running
- Node.js >= 18
- Git

## Install

```bash
curl -fsSL vidclaw.com/install.sh | bash
```

Installs Node.js, git, Tailscale, and VidClaw in one command. Localhost only: add `--no-tailscale`.

### macOS / non-root OpenClaw installs

VidClaw auto-detects `~/.openclaw` and common Homebrew OpenClaw install paths on macOS. If your OpenClaw install lives somewhere unusual, set environment variables before setup/start:

```bash
export OPENCLAW_DIR="$HOME/.openclaw"
export OPENCLAW_BUNDLED_SKILLS_DIR="/opt/homebrew/lib/node_modules/openclaw/skills"
./setup.sh
```

### Tailscale or custom bind host

Recommended: keep VidClaw bound to localhost and publish it over Tailscale Serve:

```bash
./setup.sh --tailscale
```

If you explicitly want the managed service to bind to another interface instead, set `HOST` before running `./setup.sh`:

```bash
export HOST="100.70.53.60"
./setup.sh
```

`./setup.sh` writes the launchd/systemd service definition. `./start.sh` and `./status.sh` do **not** rewrite that service config, so changing `HOST` or `OPENCLAW_*` variables later only takes effect after running `./setup.sh` again.

## Update

```bash
./update.sh
```

## Usage

```bash
./start.sh       # start the service
./stop.sh        # stop the service
./status.sh      # check service status
./logs.sh        # view logs
```

## Development

```bash
./start.sh --dev
```

Starts the backend + Vite dev server with HMR.

## API

See [API.md](API.md) for the endpoint reference.

## Stack

React + Vite + Tailwind CSS / Express.js / JSON file storage

## License

MIT

---

Copyright (c) 2026 [woocassh](https://x.com/woocassh) · MIT License
