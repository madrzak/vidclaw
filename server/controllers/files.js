import fs from 'fs';
import path from 'path';
import { __dirname, WORKSPACE, EXCLUDED } from '../config.js';
import { readHistoryFile, appendHistory } from '../lib/fileStore.js';

export function listFiles(req, res) {
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
}

export function getFileContent(req, res) {
  const reqPath = req.query.path || '';
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content, path: reqPath });
  } catch { res.status(404).json({ error: 'Not found' }); }
}

export function downloadFile(req, res) {
  const reqPath = req.query.path || '';
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  res.download(fullPath);
}

export function getWorkspaceFile(req, res) {
  const name = req.query.name;
  if (!name || name.includes('/') || name.includes('..')) return res.status(400).json({ error: 'Invalid name' });
  const fp = path.join(WORKSPACE, name);
  try {
    const content = fs.readFileSync(fp, 'utf-8');
    const stat = fs.statSync(fp);
    res.json({ content, lastModified: stat.mtime.toISOString() });
  } catch { res.json({ content: '', lastModified: null }); }
}

export function putWorkspaceFile(req, res) {
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
}

export function getWorkspaceFileHistory(req, res) {
  const name = req.query.name;
  if (!name || name.includes('/') || name.includes('..')) return res.status(400).json({ error: 'Invalid name' });
  res.json(readHistoryFile(path.join(__dirname, 'data', `${name}-history.json`)));
}

export function putFileContent(req, res) {
  const reqPath = req.body.path;
  if (!reqPath) return res.status(400).json({ error: 'Path required' });
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const safeName = reqPath.replace(/\//g, '_');
    const histPath = path.join(__dirname, 'data', `${safeName}-history.json`);
    if (fs.existsSync(fullPath)) {
      const old = fs.readFileSync(fullPath, 'utf-8');
      if (old) appendHistory(histPath, old);
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, req.body.content);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

export function deleteFile(req, res) {
  const reqPath = req.query.path;
  if (!reqPath) return res.status(400).json({ error: 'Path required' });
  const fullPath = path.join(WORKSPACE, reqPath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
