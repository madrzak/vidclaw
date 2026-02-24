# Reddit Post Drafts

---

## r/selfhosted

**Title:** VidClaw: a self-hosted dashboard for managing AI agents (open-source, localhost-only, MIT)

**Body:**

I've been running an autonomous AI agent (Claude on OpenClaw) on my homelab for a few months. It handles content writing, code tasks, and various automations. The problem: managing it through chat was a mess.

So I built **VidClaw** — a self-hosted web dashboard to manage the whole thing visually.

**What it does:**
- Kanban board for queuing and tracking agent tasks
- Real-time token usage and cost tracking
- Model switching (Claude Sonnet/Opus/Haiku) from the UI
- Soul/personality editor with version history
- Activity calendar and file browser
- Skills manager for enabling/creating agent capabilities

**Self-hosted details you'll care about:**
- Binds to `127.0.0.1:3333` only — no external network calls
- Remote access via Tailscale Serve or SSH tunnel
- No database — JSON file storage
- No accounts, no cloud, no telemetry
- One-line install: `curl -fsSL vidclaw.com/install.sh | bash`
- Stack: React + Vite + Express.js

It's MIT licensed and in beta. Would love feedback from this community — especially on security and deployment patterns.

GitHub: https://github.com/madrzak/vidclaw

---

## r/opensource

**Title:** I open-sourced my AI agent dashboard — VidClaw (React + Express, MIT license)

**Body:**

I've been building a dashboard for managing autonomous AI agents and just open-sourced it.

**The problem:** I run a Claude-based AI agent (via OpenClaw) that handles daily tasks autonomously. Managing it through conversation alone didn't scale — I needed a visual way to queue work, track spending, and configure the agent.

**VidClaw** is the result. It's a self-hosted web app that gives you:

- 🗂️ Kanban task board with drag-and-drop, priorities, and auto-execution
- 📊 Token usage tracking with cost estimates
- 🔄 Model switching between Claude variants
- 💜 Agent personality editor with version history
- 📅 Activity calendar and workspace file browser
- 🧩 Skills manager

**Tech stack:** React, Vite, Tailwind CSS, Express.js, JSON file storage. No database, no external dependencies beyond Node.js.

**Why open source:** AI agent tooling is moving fast but most dashboards are SaaS. I wanted something I could run on my own hardware with full transparency. MIT license, no strings.

Install: `curl -fsSL vidclaw.com/install.sh | bash`

Contributions welcome — especially around new dashboard panels and OpenClaw integration improvements.

GitHub: https://github.com/madrzak/vidclaw

---

## r/homelab

**Title:** Built a dashboard for my homelab AI agent — kanban boards, usage tracking, and personality editing

**Body:**

Quick background: I run an autonomous AI agent (Claude via OpenClaw) on one of my homelab boxes. It does content writing, code review, file management — basically a digital assistant that works 24/7.

The problem was managing it. Chat-only interaction meant I'd lose track of queued tasks, had no visibility into token spending, and editing the agent's config meant SSH + vim.

So I built **VidClaw** — a lightweight web dashboard that runs alongside the agent.

**Features:**
- Kanban board for task management (agent picks up cards automatically)
- Token usage & cost dashboard
- Switch between Claude models from the UI
- Edit agent personality/instructions with version history
- Activity calendar showing daily agent work
- File browser for the agent's workspace

**Homelab-friendly details:**
- Localhost only (127.0.0.1:3333)
- I access it via Tailscale Serve on port 8443
- Also works with SSH tunnel: `ssh -L 3333:localhost:3333 user@server`
- JSON file storage — no Postgres, no Redis, no Docker required
- Runs fine on a modest VPS or even a Pi
- One-line install script handles Node.js + dependencies

It's open-source (MIT) and in active development. If you're running AI agents on your homelab, I'd love to hear how you manage yours.

GitHub: https://github.com/madrzak/vidclaw
