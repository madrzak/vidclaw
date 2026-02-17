import fs from 'fs';
import { exec as execCb } from 'child_process';
import { OPENCLAW_JSON } from '../config.js';
import { logActivity } from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';

export function getSettings(req, res) {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const heartbeatEvery = config?.agents?.defaults?.heartbeat?.every || '30m';
    const timezone = config?.agents?.defaults?.timezone || 'UTC';
    res.json({ heartbeatEvery, timezone });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function postSettings(req, res) {
  try {
    const { heartbeatEvery, timezone } = req.body;

    const allowedHeartbeats = ['5m', '10m', '15m', '30m', '1h'];
    if (heartbeatEvery && !allowedHeartbeats.includes(heartbeatEvery)) {
      return res.status(400).json({ error: 'Invalid heartbeat value' });
    }

    if (timezone) {
      const valid = Intl.supportedValuesOf('timeZone');
      if (!valid.includes(timezone)) {
        return res.status(400).json({ error: 'Invalid timezone' });
      }
    }

    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    if (!config.agents) config.agents = {};
    if (!config.agents.defaults) config.agents.defaults = {};

    const heartbeatChanged = heartbeatEvery && heartbeatEvery !== config.agents.defaults.heartbeat?.every;

    if (heartbeatEvery) {
      if (!config.agents.defaults.heartbeat) config.agents.defaults.heartbeat = {};
      config.agents.defaults.heartbeat.every = heartbeatEvery;
    }
    if (timezone) {
      config.agents.defaults.timezone = timezone;
    }

    fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(config, null, 2));

    const details = {};
    if (heartbeatEvery) details.heartbeatEvery = heartbeatEvery;
    if (timezone) details.timezone = timezone;
    logActivity('dashboard', 'settings_updated', details);
    broadcast('settings', { heartbeatEvery: heartbeatEvery || config.agents.defaults.heartbeat?.every, timezone: timezone || config.agents.defaults.timezone });

    if (heartbeatChanged) {
      execCb('openclaw gateway restart', (err) => {
        if (err) console.error('Failed to restart openclaw:', err.message);
      });
    }

    res.json({ ok: true, restarted: !!heartbeatChanged });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
