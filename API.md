# API Reference

All endpoints are served on `localhost:3333`.

## Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | List available channels (auto-discovered from OpenClaw sessions) |

Returns channels that tasks can be routed to (Telegram topics, Discord threads, Slack channels, etc.). Channels are auto-discovered from live OpenClaw sessions. Optional `vidclaw-channels.json` in workspace provides friendly names.

**Response format:**
```json
[
  { "id": null, "label": "Main Session", "type": "main", "icon": "🏠", "color": "#6B7280" },
  { "id": "telegram:-123:topic:4", "label": "My Team (general)", "type": "telegram", "icon": "💬", "color": "#3B82F6" }
]
```

## Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create a task (accepts optional `channel` field) |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/run` | Mark task for immediate execution |
| POST | `/api/tasks/:id/pickup` | Mark task as picked up by agent |
| POST | `/api/tasks/:id/complete` | Mark task as done with result |
| GET | `/api/tasks/queue` | Get executable task queue (sorted by priority) |

**Task object with channel routing:**
```json
{
  "title": "Check project status",
  "description": "Review latest updates",
  "channel": "telegram:-123:topic:4",
  "priority": "high",
  "status": "todo"
}
```
When `channel` is set, the task executes in that channel's context (preserves conversation history and memory).

## Usage & Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/usage` | Usage stats with rate limit percentages |
| GET | `/api/models` | List available models (from openclaw.json) |
| POST | `/api/model` | Switch active model |

## Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | List all skills with status |
| POST | `/api/skills/:id/toggle` | Enable/disable a skill |
| POST | `/api/skills/create` | Create a custom workspace skill |
| GET | `/api/skills/:id/content` | Read full SKILL.md content |
| DELETE | `/api/skills/:id` | Delete a workspace skill |

## Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files?path=` | List directory contents |
| GET | `/api/files/content?path=` | Read file content |
| GET | `/api/files/download?path=` | Download a file |

## Soul & Workspace Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul` | Read SOUL.md |
| PUT | `/api/soul` | Save SOUL.md (with version history) |
| GET | `/api/soul/history` | Get SOUL.md version history |
| POST | `/api/soul/revert` | Revert to a previous version |
| GET | `/api/soul/templates` | List persona templates |
| GET | `/api/workspace-file?name=` | Read a workspace file |
| PUT | `/api/workspace-file?name=` | Save a workspace file (with history) |

## Heartbeat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/heartbeat` | Get last heartbeat timestamp |
| POST | `/api/heartbeat` | Record a heartbeat |

## Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar` | Get activity data from memory files |
