import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CREDS_DIR = path.join(os.homedir(), '.openclaw', 'credentials');

// Validate name is a safe slug
function validName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

export async function listCredentials(req, res) {
  try {
    await fs.mkdir(CREDS_DIR, { recursive: true });
    const entries = await fs.readdir(CREDS_DIR);
    const results = await Promise.all(
      entries.map(async (name) => {
        try {
          const stat = await fs.stat(path.join(CREDS_DIR, name));
          if (!stat.isFile()) return null;
          if (name.endsWith('.meta.json')) return null;
          let type = 'text', fileName = null;
          try {
            const meta = JSON.parse(await fs.readFile(path.join(CREDS_DIR, name + '.meta.json'), 'utf8'));
            type = meta.type || 'text';
            fileName = meta.fileName || null;
          } catch {}
          return { name, exists: true, type, fileName, modifiedAt: stat.mtime.toISOString() };
        } catch { return null; }
      })
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function putCredential(req, res) {
  const { name } = req.params;
  const { value, type = 'text' } = req.body || {};
  if (!validName(name)) return res.status(400).json({ error: 'Invalid credential name. Use only letters, numbers, hyphens, underscores.' });
  if (typeof value !== 'string' || !value) return res.status(400).json({ error: 'Value is required.' });
  try {
    await fs.mkdir(CREDS_DIR, { recursive: true });
    const filePath = path.join(CREDS_DIR, name);
    // For file type, value is base64-encoded content — decode it before writing
    const content = type === 'file' ? Buffer.from(value, 'base64') : value;
    await fs.writeFile(filePath, content, { mode: 0o600 });
    // Store metadata (type, original filename) alongside if it's a file
    if (type === 'file') {
      const { fileName } = req.body || {};
      const meta = { type: 'file', fileName: fileName || name };
      await fs.writeFile(filePath + '.meta.json', JSON.stringify(meta), { mode: 0o600 });
    } else {
      // Remove meta file if switching back to text
      await fs.unlink(filePath + '.meta.json').catch(() => {});
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteCredential(req, res) {
  const { name } = req.params;
  if (!validName(name)) return res.status(400).json({ error: 'Invalid credential name.' });
  try {
    await fs.unlink(path.join(CREDS_DIR, name));
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Not found.' });
    res.status(500).json({ error: err.message });
  }
}
