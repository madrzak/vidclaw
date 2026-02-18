import fs from 'fs';
import path from 'path';
import { WORKSPACE, OPENCLAW_DIR } from '../config.js';
import { appendHistory, readHistoryFile } from '../lib/fileStore.js';

// --- Memory Files ---

export function listMemoryFiles(req, res) {
  const files = [];

  // MEMORY.md
  const memoryMd = path.join(WORKSPACE, 'MEMORY.md');
  try {
    const stat = fs.statSync(memoryMd);
    files.push({ name: 'MEMORY.md', path: 'MEMORY.md', size: stat.size, mtime: stat.mtime.toISOString(), isDaily: false });
  } catch {}

  // memory/*.md
  const memoryDir = path.join(WORKSPACE, 'memory');
  try {
    const entries = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).sort().reverse();
    for (const name of entries) {
      try {
        const stat = fs.statSync(path.join(memoryDir, name));
        files.push({ name, path: `memory/${name}`, size: stat.size, mtime: stat.mtime.toISOString(), isDaily: true });
      } catch {}
    }
  } catch {}

  // Staleness info
  const now = Date.now();
  const enriched = files.map(f => {
    const ageMs = now - new Date(f.mtime).getTime();
    const ageHours = ageMs / 3600000;
    let health = 'fresh';
    if (ageHours > 72) health = 'stale';
    else if (ageHours > 24) health = 'aging';
    return { ...f, ageHours: Math.round(ageHours * 10) / 10, health };
  });

  res.json(enriched);
}

export function getMemoryFile(req, res) {
  const filePath = req.query.path;
  if (!filePath || filePath.includes('..')) return res.status(400).json({ error: 'Invalid path' });

  // Only allow MEMORY.md and memory/*.md
  if (filePath !== 'MEMORY.md' && !filePath.match(/^memory\/[^/]+\.md$/)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const fullPath = path.join(WORKSPACE, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stat = fs.statSync(fullPath);
    res.json({ content, lastModified: stat.mtime.toISOString() });
  } catch {
    res.json({ content: '', lastModified: null });
  }
}

export function putMemoryFile(req, res) {
  const filePath = req.query.path;
  if (!filePath || filePath.includes('..')) return res.status(400).json({ error: 'Invalid path' });

  if (filePath !== 'MEMORY.md' && !filePath.match(/^memory\/[^/]+\.md$/)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const fullPath = path.join(WORKSPACE, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Save history
  try {
    const old = fs.readFileSync(fullPath, 'utf-8');
    const histPath = fullPath + '.history.json';
    const hist = (() => { try { return JSON.parse(fs.readFileSync(histPath, 'utf-8')); } catch { return []; } })();
    hist.push({ content: old, timestamp: new Date().toISOString() });
    while (hist.length > 20) hist.shift();
    fs.writeFileSync(histPath, JSON.stringify(hist, null, 2));
  } catch {}

  fs.writeFileSync(fullPath, req.body.content || '');
  res.json({ success: true });
}

// --- Sessions ---

export function listSessions(req, res) {
  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions');
  const sessionsJsonPath = path.join(sessionsDir, 'sessions.json');

  let sessionsMeta = {};
  try { sessionsMeta = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8')); } catch {}

  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  // Get all jsonl files with stats
  let sessionFiles = [];
  try {
    sessionFiles = fs.readdirSync(sessionsDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const stat = fs.statSync(path.join(sessionsDir, f));
        const id = f.replace('.jsonl', '');
        return { id, file: f, mtime: stat.mtime, size: stat.size };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {}

  const total = sessionFiles.length;
  const page = sessionFiles.slice(offset, offset + limit);

  const sessions = page.map(sf => {
    // Find metadata from sessions.json
    let label = null, channel = null;
    for (const [key, val] of Object.entries(sessionsMeta)) {
      if (val.sessionId === sf.id) {
        label = val.label || key;
        channel = key.split(':').pop();
        break;
      }
    }

    // Quick parse first and last line for timestamps and basic info
    let firstTs = null, lastTs = null, model = null, totalTokens = 0, totalCost = 0, messageCount = 0;
    try {
      const content = fs.readFileSync(path.join(sessionsDir, sf.file), 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.timestamp) {
            if (!firstTs) firstTs = entry.timestamp;
            lastTs = entry.timestamp;
          }
          if (entry.type === 'model_change' && entry.modelId) model = entry.modelId;
          if (entry.type === 'message') messageCount++;
          const usage = entry.message?.usage || entry.usage;
          if (usage?.cost?.total) {
            totalTokens += (usage.input || 0) + (usage.output || 0);
            totalCost += usage.cost.total;
          }
        } catch {}
      }
    } catch {}

    return {
      id: sf.id,
      label,
      channel,
      model: model?.replace('anthropic/', ''),
      size: sf.size,
      firstTs,
      lastTs,
      messageCount,
      totalTokens,
      totalCost: Math.round(totalCost * 10000) / 10000,
    };
  });

  res.json({ sessions, total, offset, limit });
}

export function getSession(req, res) {
  const id = req.params.id;
  if (!id || !id.match(/^[a-f0-9-]+$/)) return res.status(400).json({ error: 'Invalid session id' });

  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions');
  const filePath = path.join(sessionsDir, `${id}.jsonl`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const entries = content.split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    // Return summary + messages (limit to avoid huge payloads)
    const messages = entries.filter(e => e.type === 'message').slice(-100).map(e => ({
      id: e.id,
      role: e.message?.role,
      timestamp: e.timestamp,
      contentPreview: typeof e.message?.content === 'string'
        ? e.message.content.slice(0, 500)
        : Array.isArray(e.message?.content)
          ? e.message.content.filter(c => c.type === 'text').map(c => c.text).join(' ').slice(0, 500)
          : '',
      usage: e.message?.usage || e.usage || null,
    }));

    res.json({ id, entries: entries.length, messages });
  } catch {
    res.status(404).json({ error: 'Session not found' });
  }
}
