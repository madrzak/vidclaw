import fs from 'fs';
import path from 'path';
import { __dirname, ACTUAL_WORKSPACE, SOUL_TEMPLATES } from '../config.js';
import { readHistoryFile, appendHistory } from '../lib/fileStore.js';

export function getSoul(req, res) {
  const fp = path.join(ACTUAL_WORKSPACE, 'SOUL.md');
  try {
    const content = fs.readFileSync(fp, 'utf-8');
    const stat = fs.statSync(fp);
    res.json({ content, lastModified: stat.mtime.toISOString() });
  } catch { res.json({ content: '', lastModified: null }); }
}

export function putSoul(req, res) {
  const fp = path.join(ACTUAL_WORKSPACE, 'SOUL.md');
  const histPath = path.join(__dirname, 'data', 'soul-history.json');
  try {
    const old = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf-8') : '';
    if (old) appendHistory(histPath, old);
    fs.writeFileSync(fp, req.body.content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export function getSoulHistory(req, res) {
  res.json(readHistoryFile(path.join(__dirname, 'data', 'soul-history.json')));
}

export function revertSoul(req, res) {
  const fp = path.join(ACTUAL_WORKSPACE, 'SOUL.md');
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
}

export function getSoulTemplates(req, res) {
  res.json(SOUL_TEMPLATES);
}
