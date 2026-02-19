# VidClaw

A secure, self-hosted command center for managing your OpenClaw AI agent.

![Dark theme dashboard with Kanban board, usage tracking, and more](https://img.shields.io/badge/status-beta-orange) ![build](https://img.shields.io/badge/build-passing-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **🗂️ Kanban Task Board** — Backlog → Todo → In Progress → Done. Drag & drop, priorities, skill assignment. Your agent picks up tasks automatically via heartbeat or cron.
- **📡 Channel Routing** *(optional)* — Route tasks to specific channels (Telegram topics, Discord threads, Slack channels) to preserve context and conversation history.
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
curl -fsSL vidclaw.com/install.sh | bash
```

Installs Node.js, git, Tailscale, and VidClaw in one command. Localhost only: add `--no-tailscale`.

## Update

```bash
./update.sh
```

## Channel Routing (Optional)

VidClaw can route tasks to specific OpenClaw channels (Telegram topics, Discord threads, Slack channels, etc.) to preserve context and conversation history.

**How it works:**
- Channels are auto-discovered from live OpenClaw sessions
- Tasks without a channel run in the main session (default)
- Tasks with a channel run in that channel's context (e.g., Telegram topic 4)

**Setup (optional):**

Create `vidclaw-channels.json` in your OpenClaw workspace to add friendly names:

```json
{
  "telegram:-1003821920425": {
    "name": "My Team"
  },
  "telegram:-1003821920425:topic:1": {
    "name": "general",
    "icon": "💬"
  },
  "telegram:-1003821920425:topic:2": {
    "name": "projects",
    "icon": "🚀"
  }
}
```

Without this file, channels appear with generic labels (e.g., "Group -123 (Topic 1)").

**Supported channel types:**
- Telegram topics (`telegram:GROUP_ID:topic:TOPIC_ID`)
- Discord threads (`discord:CHANNEL_ID:thread:THREAD_ID`)
- Slack threads (`slack:CHANNEL_ID:thread:THREAD_ID`)

**UI behavior:**
- Channel dropdown only appears if you have multiple channels
- Users without channels see no difference in the UI

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
