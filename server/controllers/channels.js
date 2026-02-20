import fs from 'fs';
import path from 'path';
import { __dirname, OPENCLAW_JSON } from '../config.js';

/*
 * Channel Routing Logic
 * ---------------------
 * Tasks can optionally specify a `channel` field (e.g. "telegram", "discord").
 * When a task is picked up for execution, the agent can use this field to
 * determine which channel/context the task should run in.
 *
 * - channel: null  → main session (default, current behavior)
 * - channel: "telegram" → route execution to the Telegram channel
 * - channel: "discord"  → route execution to the Discord channel
 *
 * The channel list is read from:
 *   1. server/data/channels.json (user-editable, takes priority)
 *   2. Falls back to a sensible default list
 *
 * NOTE: Channel assignment is currently UI-only (tagging/filtering).
 * Actual execution routing to specific channels is planned for future work.
 *
 * Future: read from openclaw.json to auto-discover configured channels.
 */

const CHANNELS_FILE = path.join(__dirname, 'data', 'channels.json');

const DEFAULT_CHANNELS = [
  { id: 'telegram', label: 'Telegram', icon: 'MessageCircle' },
  { id: 'discord', label: 'Discord', icon: 'Hash' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'Smartphone' },
  { id: 'slack', label: 'Slack', icon: 'Slack' },
];

/**
 * Returns an array of known channel ID strings.
 * Used for server-side validation of the task `channel` field.
 */
export function getKnownChannelIds() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      return data.map(c => c.id);
    }
  } catch {}
  return DEFAULT_CHANNELS.map(c => c.id);
}

export function listChannels(req, res) {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      return res.json(data);
    }
  } catch {}
  res.json(DEFAULT_CHANNELS);
}
