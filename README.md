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

Two ways to access from another device:

| Method | Command |
|--------|---------|
| **SSH tunnel** | `ssh -L 3333:localhost:3333 <user>@<server>` |
| **Tailscale Serve** | Pass `--tailscale` to `setup.sh` (see Install) |

Then open `http://localhost:3333` (SSH) or `https://your-machine.your-tailnet.ts.net:8443` (Tailscale).

## Prerequisites

- OpenClaw installed and running
- Node.js >= 18
- Git

## Install

```bash
cd ~/.openclaw/workspace
git clone https://github.com/madrzak/vidclaw.git dashboard
cd dashboard
./setup.sh                  # localhost-only
./setup.sh --tailscale      # with Tailscale Serve on port 8443
```

`setup.sh` is idempotent — safe to re-run. Run `./doctor.sh` to verify your environment.

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

Copyright (c) 2026 [woocassh](https://x.com/woocassh) · [GitHub](https://github.com/madrzak/vidclaw) · MIT License
