import {
  readOpenclawJson, writeOpenclawJson, readHeartbeat, writeHeartbeat,
} from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';

export function listModels(req, res) {
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
}

export function setModel(req, res) {
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
}

export function getHeartbeat(req, res) {
  res.json(readHeartbeat());
}

export function postHeartbeat(req, res) {
  const data = { lastHeartbeat: Date.now() };
  writeHeartbeat(data);
  broadcast('heartbeat', data);
  res.json(data);
}
