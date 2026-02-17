import { exec as execCb } from 'child_process';
import { OPENCLAW_API_BASE } from '../config.js';
import { logActivity } from '../lib/fileStore.js';
import { fetchOpenclawJson } from '../lib/openclaw.js';
import { exec, compareSemver } from '../lib/exec.js';

export async function getOpenclawUsage(req, res) {
  const candidates = ['/api/usage', '/api/v1/usage', '/api/status', '/status'];
  for (const ep of candidates) {
    try {
      const data = await fetchOpenclawJson(ep);
      return res.json({ ...data, _source: ep });
    } catch {}
  }
  res.status(502).json({
    error: 'No JSON usage API found on OpenClaw',
    detail: `Tried ${candidates.join(', ')} on ${OPENCLAW_API_BASE}. The /usage endpoint returns HTML (a web page), not a JSON API.`,
    hint: 'Usage data is still available from local session file scanning.',
  });
}

export async function getOpenclawStatus(req, res) {
  try {
    const data = await fetchOpenclawJson('/api/status');
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach OpenClaw API', detail: e.message });
  }
}

export async function proxyOpenclaw(req, res) {
  const endpoint = '/' + req.params[0];
  try {
    const data = await fetchOpenclawJson(endpoint);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach OpenClaw API', detail: e.message });
  }
}

export async function getOpenclawVersion(req, res) {
  const result = {};
  try {
    result.current = await exec('openclaw --version');
  } catch (e) {
    result.current = null;
    result.currentError = e.message;
  }
  try {
    result.latest = await exec('npm view openclaw version');
  } catch (e) {
    result.latest = null;
    result.latestError = e.message;
  }
  if (result.current && result.latest) {
    result.outdated = compareSemver(result.current, result.latest) < 0;
  } else {
    result.outdated = null;
  }
  res.json(result);
}

export async function updateOpenclaw(req, res) {
  try {
    await exec('npm install -g openclaw@latest');
    const version = await exec('openclaw --version');
    execCb('openclaw gateway restart', (err) => {
      if (err) console.error('Failed to restart openclaw after update:', err.message);
    });
    logActivity('dashboard', 'openclaw_updated', { version });
    res.json({ success: true, version });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
