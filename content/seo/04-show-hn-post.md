# Show HN Draft

**Title:** Show HN: VidClaw – Open-source, self-hosted dashboard for managing AI agents

**URL:** https://github.com/madrzak/vidclaw

**Text:**

Hi HN, I built VidClaw — an open-source dashboard for managing OpenClaw AI agents.

I run an autonomous Claude agent that handles content writing, code tasks, and SEO tracking. Managing it through chat was getting chaotic: I'd forget what I asked for, lose track of spending, and dread editing personality files over SSH.

VidClaw is a self-hosted web dashboard (React + Express) that gives you:

- **Kanban task board** — Drag-and-drop cards with priorities and skill assignment. The agent picks up tasks automatically every 2 min.
- **Token usage & cost tracking** — Real-time stats with progress bars matching Anthropic's rate-limit windows.
- **Model hot-switching** — Change Claude models from a dropdown. Config reloads without restart.
- **Soul editor** — Edit your agent's persona and instructions with version history.
- **Activity calendar** — Daily heatmap of what the agent worked on.
- **Skills manager** — Toggle and create agent skills.

It binds to localhost only — access via Tailscale or SSH tunnel. No cloud, no accounts, no telemetry. MIT licensed.

Install: `curl -fsSL vidclaw.com/install.sh | bash`

Stack: React, Vite, Tailwind CSS, Express.js, JSON file storage. No database required.

I'd love feedback on the UX and feature priorities. What would you want from an AI agent dashboard?

GitHub: https://github.com/madrzak/vidclaw
