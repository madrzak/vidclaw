import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exec as execCb } from 'child_process';
import {
  __dirname, OPENCLAW_DIR, WORKSPACE, OPENCLAW_JSON, OPENCLAW_API_BASE,
  SKILLS_DIRS, EXCLUDED, SOUL_TEMPLATES,
} from './config.js';
import { broadcast } from './broadcast.js';
import {
  readTasks, writeTasks, readActivity, logActivity,
  readHeartbeat, writeHeartbeat, readOpenclawJson, writeOpenclawJson,
  readHistoryFile, appendHistory,
} from './lib/fileStore.js';
import {
  getTimezone, getDatePartsInTz, startOfDayInTz, startOfWeekInTz,
  startOfMonthInTz, isoToDateInTz,
} from './lib/timezone.js';
import { fetchOpenclawJson } from './lib/openclaw.js';
import { scanSkills } from './lib/skills.js';
import { formatDuration } from './lib/format.js';

const router = Router();

// --- Activity ---
router.get('/api/activity', (req, res) => {
  const log = readActivity();
  const limit = parseInt(req.query.limit) || 50;
  const taskId = req.query.taskId;
  const filtered = taskId ? log.filter(a => a.details?.taskId === taskId) : log;
  res.json(filtered.slice(-limit).reverse());
});

// --- Tasks ---
router.get('/api/tasks', (req, res) => res.json(readTasks()));

router.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: req.body.title || 'Untitled',
    description: req.body.description || '',
    priority: req.body.priority || 'medium',
    skill: req.body.skill || '',
    skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skill ? [req.body.skill] : []),
    status: req.body.status || 'backlog',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    schedule: req.body.schedule || null,
    scheduledAt: req.body.scheduledAt || null,
    result: null,
    startedAt: null,
    error: null,
    order: req.body.order ?? tasks.filter(t => t.status === (req.body.status || 'backlog')).length,
  };
  tasks.push(task);
  writeTasks(tasks);
  logActivity('user', 'task_created', { taskId: task.id, title: task.title });
  broadcast('tasks', tasks);
  res.json(task);
});

router.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const wasNotDone = tasks[idx].status !== 'done';
  const allowedFields = ['title', 'description', 'priority', 'skill', 'skills', 'status', 'schedule', 'scheduledAt', 'result', 'startedAt', 'completedAt', 'error', 'order'];
  const updates = {};
  for (const k of allowedFields) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  if (wasNotDone && tasks[idx].status === 'done') tasks[idx].completedAt = new Date().toISOString();
  if (tasks[idx].status !== 'done') tasks[idx].completedAt = null;
  writeTasks(tasks);
  const actor = req.body._actor || 'user';
  logActivity(actor, 'task_updated', { taskId: req.params.id, title: tasks[idx].title, changes: Object.keys(updates) });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
});

router.post('/api/tasks/reorder', (req, res) => {
  const { status, order } = req.body;
  if (!status || !Array.isArray(order)) return res.status(400).json({ error: 'status and order[] required' });
  const tasks = readTasks();
  for (let i = 0; i < order.length; i++) {
    const idx = tasks.findIndex(t => t.id === order[i]);
    if (idx !== -1) tasks[idx].order = i;
  }
  writeTasks(tasks);
  broadcast('tasks', tasks);
  res.json({ ok: true });
});

router.post('/api/tasks/:id/run', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tasks[idx].status = 'in-progress';
  tasks[idx].startedAt = new Date().toISOString();
  tasks[idx].updatedAt = new Date().toISOString();
  writeTasks(tasks);
  logActivity('user', 'task_run', { taskId: req.params.id, title: tasks[idx].title });
  broadcast('tasks', tasks);
  res.json({ success: true, message: 'Task queued for execution' });
});

router.get('/api/tasks/queue', (req, res) => {
  const tasks = readTasks();
  const now = new Date();
  const queue = tasks.filter(t => {
    if (t.status === 'in-progress' && !t.pickedUp) return true;
    if (t.status !== 'todo') return false;
    if (!t.schedule) return true;
    if (t.schedule === 'asap' || t.schedule === 'next-heartbeat') return true;
    if (t.schedule !== 'asap' && t.schedule !== 'next-heartbeat') {
      return new Date(t.schedule) <= now;
    }
    return true;
  });
  queue.sort((a, b) => {
    const oa = a.order ?? 999999;
    const ob = b.order ?? 999999;
    if (oa !== ob) return oa - ob;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
  res.json(queue);
});

router.post('/api/tasks/:id/pickup', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tasks[idx].pickedUp = true;
  tasks[idx].status = 'in-progress';
  tasks[idx].startedAt = tasks[idx].startedAt || new Date().toISOString();
  tasks[idx].updatedAt = new Date().toISOString();
  writeTasks(tasks);
  logActivity('bot', 'task_pickup', { taskId: req.params.id, title: tasks[idx].title });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
});

router.post('/api/tasks/:id/complete', (req, res) => {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tasks[idx].status = 'done';
  tasks[idx].completedAt = new Date().toISOString();
  tasks[idx].updatedAt = new Date().toISOString();
  tasks[idx].result = req.body.result || null;
  if (req.body.error) tasks[idx].error = req.body.error;
  writeTasks(tasks);
  logActivity('bot', 'task_completed', { taskId: req.params.id, title: tasks[idx].title, hasError: !!req.body.error });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
});

router.delete('/api/tasks/:id', (req, res) => {
  let tasks = readTasks();
  const deleted = tasks.find(t => t.id === req.params.id);
  tasks = tasks.filter(t => t.id !== req.params.id);
  writeTasks(tasks);
  if (deleted) logActivity('user', 'task_deleted', { taskId: req.params.id, title: deleted.title });
  broadcast('tasks', tasks);
  res.json({ ok: true });
});

// --- Time ---
router.get('/api/time', (req, res) => {
  const now = new Date();
  const tz = getTimezone();
  const p = getDatePartsInTz(now, tz);
  res.json({
    timezone: tz,
    iso: now.toISOString(),
    local: now.toLocaleString('en-US', { timeZone: tz }),
    weekday: p.weekday,
    year: p.year,
    month: p.month + 1,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
  });
});

// --- Usage ---
router.get('/api/usage', (req, res) => {
  const now = new Date();
  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions');

  let tokensToday = 0, tokensWeek = 0, tokensMonth = 0;
  let costToday = 0, costWeek = 0, costMonth = 0;
  const sessionsToday = new Set(), sessionsWeek = new Set(), sessionsMonth = new Set();

  const tz = getTimezone();
  const todayStart = startOfDayInTz(now, tz);
  const weekStart = startOfWeekInTz(now, tz);
  const monthStart = startOfMonthInTz(now, tz);

  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime < monthStart) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const usage = entry.message?.usage || entry.usage;
          if (usage?.cost?.total) {
            const tokens = (usage.input || 0) + (usage.output || 0) + (usage.cacheRead || 0);
            const cost = usage.cost.total;
            const ts = new Date(entry.timestamp || stat.mtime);

            if (ts >= monthStart) { tokensMonth += tokens; costMonth += cost; sessionsMonth.add(file); }
            if (ts >= weekStart) { tokensWeek += tokens; costWeek += cost; sessionsWeek.add(file); }
            if (ts >= todayStart) { tokensToday += tokens; costToday += cost; sessionsToday.add(file); }
          }
        } catch {}
      }
    }
  } catch {}

  const tomorrowReset = new Date(todayStart); tomorrowReset.setDate(tomorrowReset.getDate() + 1);
  const nextWeekReset = new Date(weekStart); nextWeekReset.setDate(nextWeekReset.getDate() + 7);
  const nextMonthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const sessionWindowStart = new Date(now - 5 * 3600000);
  let tokensSession = 0, costSession = 0;
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime < sessionWindowStart) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line);
          const u = entry.message?.usage || entry.usage;
          if (u?.cost?.total) {
            const ts = new Date(entry.timestamp || stat.mtime);
            if (ts >= sessionWindowStart) {
              tokensSession += (u.input || 0) + (u.output || 0) + (u.cacheRead || 0);
              costSession += u.cost.total;
            }
          }
        } catch {}
      }
    }
  } catch {}

  const sessionResetTime = new Date(sessionWindowStart.getTime() + 5 * 3600000);
  const sessionResetIn = formatDuration(Math.max(0, sessionResetTime - now));

  const config = readOpenclawJson();
  const model = (config.agents?.defaults?.model?.primary || 'unknown').replace('anthropic/', '');

  const SESSION_LIMIT = 45000000;
  const WEEKLY_LIMIT = 180000000;

  const sessionPct = Math.min(100, Math.round((tokensSession / SESSION_LIMIT) * 100));
  const weeklyPct = Math.min(100, Math.round((tokensWeek / WEEKLY_LIMIT) * 100));

  res.json({
    model,
    timezone: tz,
    tiers: [
      {
        label: 'Current session',
        percent: sessionPct,
        resetsIn: sessionResetIn,
        tokens: tokensSession,
        cost: costSession,
      },
      {
        label: 'Current week (all models)',
        percent: weeklyPct,
        resetsIn: formatDuration(nextWeekReset - now),
        tokens: tokensWeek,
        cost: costWeek,
      },
    ],
    details: {
      today: { tokens: tokensToday, cost: costToday, sessions: sessionsToday.size },
      week: { tokens: tokensWeek, cost: costWeek, sessions: sessionsWeek.size },
      month: { tokens: tokensMonth, cost: costMonth, sessions: sessionsMonth.size },
    },
  });
});

// --- OpenClaw Proxy ---
router.get('/api/openclaw/usage', async (req, res) => {
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
});

router.get('/api/openclaw/status', async (req, res) => {
  try {
    const data = await fetchOpenclawJson('/api/status');
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach OpenClaw API', detail: e.message });
  }
});

router.get('/api/openclaw/proxy/*', async (req, res) => {
  const endpoint = '/' + req.params[0];
  try {
    const data = await fetchOpenclawJson(endpoint);
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Could not reach OpenClaw API', detail: e.message });
  }
});

// --- Models ---
router.get('/api/models', (req, res) => {
  try {
    const config = readOpenclawJson();
    const modelsConfig = config.agents?.defaults?.models || {};
    const primary = config.agents?.defaults?.model?.primary;
    const fallbacks = config.agents?.defaults?.model?.fallbacks || [];
    const models = new Set([primary, ...fallbacks, ...Object.keys(modelsConfig)].filter(Boolean));
    res.json([...models]);
  } catch {
    res.json([]);
  }
});

router.post('/api/model', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'model required' });
  try {
    const config = readOpenclawJson();
    if (!config.agents) config.agents = {};
    if (!config.agents.defaults) config.agents.defaults = {};
    if (!config.agents.defaults.model) config.agents.defaults.model = {};
    config.agents.defaults.model.primary = model;
    writeOpenclawJson(config);
    res.json({ success: true, model });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Heartbeat ---
router.get('/api/heartbeat', (req, res) => {
  res.json(readHeartbeat());
});

router.post('/api/heartbeat', (req, res) => {
  const data = { lastHeartbeat: Date.now() };
  writeHeartbeat(data);
  broadcast('heartbeat', data);
  res.json(data);
});

// --- Skills ---
router.get('/api/skills', (req, res) => {
  res.json(scanSkills());
});

router.post('/api/skills/:id/toggle', (req, res) => {
  const config = readOpenclawJson();
  if (!config.skills) config.skills = {};
  if (!config.skills.entries) config.skills.entries = {};
  const enabled = req.body.enabled !== undefined ? req.body.enabled : !(config.skills.entries[req.params.id]?.enabled ?? true);
  config.skills.entries[req.params.id] = { ...(config.skills.entries[req.params.id] || {}), enabled };
  writeOpenclawJson(config);
  const skill = scanSkills().find(s => s.id === req.params.id);
  res.json(skill || { id: req.params.id, enabled });
});

router.post('/api/skills/create', (req, res) => {
  const { name, description, instructions } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const dir = path.join(SKILLS_DIRS.workspace, name);
  fs.mkdirSync(dir, { recursive: true });
  const md = `---\nname: ${name}\ndescription: ${description || ''}\n---\n\n${instructions || ''}`;
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md);
  const skill = scanSkills().find(s => s.id === name && s.source === 'workspace');
  res.json(skill || { id: name, name, source: 'workspace' });
});

router.get('/api/skills/:id/content', (req, res) => {
  const all = scanSkills();
  const skill = all.find(s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Not found' });
  try {
    const content = fs.readFileSync(path.join(skill.path, 'SKILL.md'), 'utf-8');
    res.json({ content });
  } catch { res.status(404).json({ error: 'No SKILL.md' }); }
});

router.delete('/api/skills/:id', (req, res) => {
  const all = scanSkills();
  const skill = all.find(s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Not found' });
  if (skill.source !== 'workspace') return res.status(403).json({ error: 'Can only delete workspace skills' });
  fs.rmSync(skill.path, { recursive: true, force: true });
  res.json({ ok: true });
});

// --- Files ---
router.get('/api/files', (req, res) => {
  const reqPath = req.query.path || '';
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(e => {
        if (EXCLUDED.has(e.name)) return false;
        if (reqPath === 'dashboard' && e.name === 'node_modules') return false;
        return true;
      })
      .map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(reqPath, e.name) }))
      .sort((a, b) => b.isDirectory - a.isDirectory || a.name.localeCompare(b.name));
    res.json(entries);
  } catch { res.json([]); }
});

router.get('/api/files/content', (req, res) => {
  const reqPath = req.query.path || '';
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content, path: reqPath });
  } catch { res.status(404).json({ error: 'Not found' }); }
});

router.get('/api/files/download', (req, res) => {
  const reqPath = req.query.path || '';
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  res.download(fullPath);
});

// --- Calendar ---
router.get('/api/calendar', (req, res) => {
  const memoryDir = path.join(WORKSPACE, 'memory');
  const data = {};
  try {
    const files = fs.readdirSync(memoryDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    for (const f of files) {
      const date = f.replace('.md', '');
      data[date] = data[date] || { memory: false, tasks: [] };
      data[date].memory = true;
    }
  } catch {}
  const tasks = readTasks();
  for (const t of tasks) {
    if (t.completedAt) {
      const date = isoToDateInTz(t.completedAt);
      data[date] = data[date] || { memory: false, tasks: [] };
      data[date].tasks.push(t.title);
    }
  }
  res.json(data);
});

// --- Soul ---
router.get('/api/soul', (req, res) => {
  const fp = path.join(WORKSPACE, 'SOUL.md');
  try {
    const content = fs.readFileSync(fp, 'utf-8');
    const stat = fs.statSync(fp);
    res.json({ content, lastModified: stat.mtime.toISOString() });
  } catch { res.json({ content: '', lastModified: null }); }
});

router.put('/api/soul', (req, res) => {
  const fp = path.join(WORKSPACE, 'SOUL.md');
  const histPath = path.join(__dirname, 'data', 'soul-history.json');
  try {
    const old = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : '';
    if (old) appendHistory(histPath, old);
    fs.writeFileSync(fp, req.body.content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/soul/history', (req, res) => {
  res.json(readHistoryFile(path.join(__dirname, 'data', 'soul-history.json')));
});

router.post('/api/soul/revert', (req, res) => {
  const fp = path.join(WORKSPACE, 'SOUL.md');
  const histPath = path.join(__dirname, 'data', 'soul-history.json');
  const history = readHistoryFile(histPath);
  const idx = req.body.index;
  if (idx < 0 || idx >= history.length) return res.status(400).json({ error: 'Invalid index' });
  try {
    const current = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : '';
    if (current) appendHistory(histPath, current);
    const content = history[idx].content;
    fs.writeFileSync(fp, content);
    res.json({ success: true, content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/soul/templates', (req, res) => {
  res.json(SOUL_TEMPLATES);
});

// --- Workspace File ---
router.get('/api/workspace-file', (req, res) => {
  const name = req.query.name;
  if (!name || name.includes('/') || name.includes('..')) return res.status(400).json({ error: 'Invalid name' });
  const fp = path.join(WORKSPACE, name);
  try {
    const content = fs.readFileSync(fp, 'utf-8');
    const stat = fs.statSync(fp);
    res.json({ content, lastModified: stat.mtime.toISOString() });
  } catch { res.json({ content: '', lastModified: null }); }
});

router.put('/api/workspace-file', (req, res) => {
  const name = req.query.name;
  if (!name || name.includes('/') || name.includes('..')) return res.status(400).json({ error: 'Invalid name' });
  const fp = path.join(WORKSPACE, name);
  const histPath = path.join(__dirname, 'data', `${name}-history.json`);
  try {
    const old = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : '';
    if (old) appendHistory(histPath, old);
    fs.writeFileSync(fp, req.body.content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/api/workspace-file/history', (req, res) => {
  const name = req.query.name;
  if (!name || name.includes('/') || name.includes('..')) return res.status(400).json({ error: 'Invalid name' });
  res.json(readHistoryFile(path.join(__dirname, 'data', `${name}-history.json`)));
});

// --- Settings ---
router.get('/api/settings', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8'));
    const heartbeatEvery = config?.agents?.defaults?.heartbeat?.every || '30m';
    const timezone = config?.agents?.defaults?.timezone || 'UTC';
    res.json({ heartbeatEvery, timezone });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/settings', async (req, res) => {
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
});

// SPA fallback
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

export default router;
