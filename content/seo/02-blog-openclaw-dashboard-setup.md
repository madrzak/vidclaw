# How to Set Up VidClaw: A Self-Hosted Dashboard for Your OpenClaw AI Agent

*A step-by-step guide to installing and configuring VidClaw on your own server.*

---

If you're running an [OpenClaw](https://github.com/openclaw/openclaw) AI agent, you've probably hit the point where managing everything through chat feels like herding cats. Tasks pile up, you lose track of token usage, and editing your agent's personality means SSH-ing in and hand-editing markdown files.

VidClaw fixes this. It's an open-source, self-hosted dashboard that gives you a visual command center for your OpenClaw agent — kanban boards, usage tracking, model switching, and more.

Here's how to get it running in under five minutes.

## Prerequisites

You'll need:

- A server (VPS, homelab box, or even a Raspberry Pi) running Linux
- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- Node.js 18+ (the installer handles this if you don't have it)
- Git

## Step 1: Install VidClaw

One command does everything:

```bash
curl -fsSL vidclaw.com/install.sh | bash
```

This installs Node.js and Git if missing, clones the VidClaw repo, installs dependencies, and sets up a systemd service. It also configures Tailscale for secure remote access.

If you prefer localhost-only access (e.g., you'll use an SSH tunnel):

```bash
curl -fsSL vidclaw.com/install.sh | bash -s -- --no-tailscale
```

## Step 2: Access the Dashboard

**Local access:**
Open `http://localhost:3333` in your browser.

**Remote access via Tailscale:**
After install, VidClaw is available at `https://your-machine.your-tailnet.ts.net:8443`.

**Remote access via SSH tunnel:**
```bash
ssh -L 3333:localhost:3333 user@your-server
```
Then open `http://localhost:3333` on your local machine.

## Step 3: Tour the Dashboard

Once you're in, you'll see six main panels:

### Kanban Task Board
This is your agent's work queue. Create cards, set priorities (low/medium/high/critical), and assign specific skills. Cards flow through four columns: Backlog → Todo → In Progress → Done.

Your agent checks this board automatically — every 2 minutes via cron or every 30 minutes via heartbeat. You can also hit "Run Now" on any task for immediate execution.

### Usage Tracking
See real-time token consumption and cost estimates. The progress bars match Anthropic's rate-limit windows, so you can plan heavy workloads without getting throttled.

### Model Switching
Switch between Claude models (Sonnet, Opus, Haiku) directly from the navbar dropdown. VidClaw hot-reloads the OpenClaw config — no restart required.

### Skills Manager
Browse all bundled and workspace skills. Toggle them on/off or create custom skills. Changes take effect on the agent's next session.

### Soul Editor
Edit SOUL.md, IDENTITY.md, USER.md, and AGENTS.md with a proper editor. Version history lets you revert if a personality tweak goes sideways. Six starter persona templates are included.

### Activity Calendar
A monthly heatmap showing when your agent was active and what it worked on, parsed from memory files and task history.

## Step 4: Create Your First Task

1. Click **+ New Task** on the Kanban board
2. Give it a title (e.g., "Write a README for my side project")
3. Set priority to **Medium**
4. Optionally assign a skill (e.g., "writer")
5. Click **Create** — the card lands in Backlog
6. Drag it to **Todo**

Your agent will pick it up on the next cron cycle (within 2 minutes) or heartbeat (within 30 minutes). Watch it move to "In Progress" and eventually "Done."

## Step 5: Customize Your Agent's Personality

Head to the **Soul Editor** tab. Here you can shape how your agent thinks, writes, and behaves. The key files:

- **SOUL.md** — Core personality and values
- **IDENTITY.md** — Name, voice, style
- **USER.md** — Information about you (so the agent understands context)
- **AGENTS.md** — Operating instructions and workspace rules

Edit, save, and your agent picks up changes on the next session.

## Keeping VidClaw Updated

```bash
cd ~/vidclaw  # or wherever you installed it
./update.sh
```

This pulls the latest changes and restarts the service.

## Troubleshooting

**Dashboard won't load?**
- Check the service: `./status.sh`
- View logs: `./logs.sh`
- Ensure port 3333 isn't occupied: `lsof -i :3333`

**Agent not picking up tasks?**
- Verify OpenClaw is running: `openclaw gateway status`
- Check that cron or heartbeat is configured in your agent's AGENTS.md

## What's Next

VidClaw is in beta and actively developed. Follow [@woocassh](https://x.com/woocassh) for updates, or star the [GitHub repo](https://github.com/madrzak/vidclaw) to stay in the loop.

If you're running AI agents in production, a visual dashboard isn't a luxury — it's a necessity. VidClaw gives you that without sending a single byte to someone else's server.

---

*VidClaw is MIT-licensed and free forever. [Get started →](https://github.com/madrzak/vidclaw)*
