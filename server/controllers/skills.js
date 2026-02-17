import fs from 'fs';
import path from 'path';
import { SKILLS_DIRS } from '../config.js';
import { readOpenclawJson, writeOpenclawJson } from '../lib/fileStore.js';
import { scanSkills } from '../lib/skills.js';

export function listSkills(req, res) {
  res.json(scanSkills());
}

export function toggleSkill(req, res) {
  const config = readOpenclawJson();
  if (!config.skills) config.skills = {};
  if (!config.skills.entries) config.skills.entries = {};
  const enabled = req.body.enabled !== undefined ? req.body.enabled : !(config.skills.entries[req.params.id]?.enabled ?? true);
  config.skills.entries[req.params.id] = { ...(config.skills.entries[req.params.id] || {}), enabled };
  writeOpenclawJson(config);
  const skill = scanSkills().find(s => s.id === req.params.id);
  res.json(skill || { id: req.params.id, enabled });
}

export function createSkill(req, res) {
  const { name, description, instructions } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const dir = path.join(SKILLS_DIRS.workspace, name);
  fs.mkdirSync(dir, { recursive: true });
  const md = `---\nname: ${name}\ndescription: ${description || ''}\n---\n\n${instructions || ''}`;
  fs.writeFileSync(path.join(dir, 'SKILL.md'), md);
  const skill = scanSkills().find(s => s.id === name && s.source === 'workspace');
  res.json(skill || { id: name, name, source: 'workspace' });
}

export function getSkillContent(req, res) {
  const all = scanSkills();
  const skill = all.find(s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Not found' });
  try {
    const content = fs.readFileSync(path.join(skill.path, 'SKILL.md'), 'utf-8');
    res.json({ content });
  } catch { res.status(404).json({ error: 'No SKILL.md' }); }
}

export function deleteSkill(req, res) {
  const all = scanSkills();
  const skill = all.find(s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Not found' });
  if (skill.source !== 'workspace') return res.status(403).json({ error: 'Can only delete workspace skills' });
  fs.rmSync(skill.path, { recursive: true, force: true });
  res.json({ ok: true });
}
