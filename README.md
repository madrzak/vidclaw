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

## Security

The dashboard binds to **localhost only** (127.0.0.1:3333). Access it via SSH tunnel:

```bash
ssh -L 3333:localhost:3333 root@your-server
```

Then open `http://localhost:3333` in your browser. No ports exposed, no auth needed — SSH is the auth layer.

## Quick Install

### Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- Node.js 18+ (see below)
- SSH access to your server

#### Installing Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# macOS
brew install node

# Or use nvm (any platform)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
```

### Setup

```bash
# Clone into your OpenClaw workspace
cd ~/.openclaw/workspace
git clone https://github.com/madrzak/vidclaw.git dashboard

# Run the setup script (installs deps, builds, sets up systemd)
cd dashboard
./setup.sh
```

That's it. The setup script handles everything — npm install, frontend build, systemd service creation, and starts the dashboard automatically.

Access via SSH tunnel:
```bash
ssh -L 3333:localhost:3333 root@your-server
# Then open http://localhost:3333
```

The setup script also configures your `HEARTBEAT.md` so your agent automatically picks up tasks from the board.

## Updating

```bash
cd ~/.openclaw/workspace/dashboard

# Update to latest stable release (recommended)
./update.sh

# Update to bleeding edge (latest commit on main)
./update.sh --latest
```

## Configuration

Models and usage data are pulled automatically from your OpenClaw config (`openclaw.json`).

## API

See [API.md](API.md) for the full endpoint reference.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js
- **Data:** JSON files (no database required)
- **Auth:** SSH tunnel (zero-config security)

## License

MIT

---

Copyright (c) 2026 [woocassh](https://x.com/woocassh) · [GitHub](https://github.com/madrzak/vidclaw) · MIT License
