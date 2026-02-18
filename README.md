<h1 align="center">
  VidClaw — Open-Source, Self-Hosted Dashboard for OpenClaw AI Agents
</h1>

<p align="center">
  <strong>A secure, self-hosted command center for managing your <a href="https://openclaw.ai">OpenClaw</a> AI agent — right from your browser.</strong>
</p>

<p align="center">
  <a href="https://github.com/madrzak/vidclaw/stargazers"><img src="https://img.shields.io/github/stars/madrzak/vidclaw?style=social" alt="GitHub stars for VidClaw open-source dashboard"></a>
  <a href="https://github.com/madrzak/vidclaw/blob/main/LICENSE"><img src="https://img.shields.io/github/license/madrzak/vidclaw" alt="MIT License"></a>
  <a href="https://github.com/madrzak/vidclaw/releases"><img src="https://img.shields.io/github/v/release/madrzak/vidclaw" alt="Latest release"></a>
  <img src="https://img.shields.io/badge/status-beta-orange" alt="Beta status">
  <a href="https://vidclaw.com"><img src="https://img.shields.io/badge/website-vidclaw.com-blue" alt="VidClaw website"></a>
</p>

<p align="center">
  <a href="https://vidclaw.com">🌐 vidclaw.com</a> · <a href="#install">⚡ Quick Start</a> · <a href="API.md">📖 API Docs</a>
</p>

---

## What is VidClaw?

**VidClaw** is an **open-source, self-hosted dashboard** that gives you full visibility and control over your [OpenClaw](https://openclaw.ai) AI agent. Track usage, manage tasks, switch models, browse files — all from a clean web UI that runs entirely on your own machine.

> **🔒 Privacy-first:** VidClaw binds to `localhost` only — no external network calls, all data stays on your machine.

![VidClaw open-source self-hosted Kanban task board for OpenClaw AI agent management](docs/img/kanban.png)

## Features

- **🗂️ Kanban Task Board** — Backlog → Todo → In Progress → Done. Drag & drop, priorities, skill assignment. Your agent picks up tasks automatically via heartbeat or cron.
- **📊 Usage Tracking** — Real-time token usage and cost estimates parsed from session transcripts. Progress bars matching Anthropic's rate limit windows.
- **🔄 Model Switching** — Switch between Claude models directly from the dashboard. Hot-reloads via OpenClaw's config watcher.
- **📅 Activity Calendar** — Monthly view of agent activity, parsed from memory files and task history.
- **📁 Content Browser** — Browse workspace files with markdown preview, syntax highlighting, and download.
- **🧩 Skills Manager** — View all bundled/workspace skills, enable/disable them, create custom skills.
- **💜 Soul Editor** — Edit SOUL.md, IDENTITY.md, USER.md, AGENTS.md with version history and persona templates.
- **⚡ Task Execution** — Tasks execute automatically via cron (every 2 min) or heartbeat (every 30 min). Hit "Run Now" for immediate execution.

![VidClaw self-hosted AI agent usage tracking and cost monitoring dashboard](docs/img/usage.png)

![VidClaw OpenClaw agent activity calendar view](docs/img/calendar.png)

## Security

VidClaw binds to localhost only (`127.0.0.1:3333`) — no external network calls, all data stays on your machine.

Two ways to access from another device:

| Method | Command |
|--------|---------|
| **SSH tunnel** | `ssh -L 3333:localhost:3333 <user>@<server>` |
| **Tailscale Serve** | Pass `--tailscale` to `setup.sh` (see [Install](#install)) |

Then open `http://localhost:3333` (SSH) or `https://your-machine.your-tailnet.ts.net:8443` (Tailscale).

## Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running
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

MIT — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <a href="https://vidclaw.com">vidclaw.com</a> · Copyright (c) 2026 <a href="https://x.com/woocassh">woocassh</a> · <a href="https://github.com/madrzak/vidclaw">GitHub</a> · MIT License
</p>
