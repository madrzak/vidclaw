import fs from 'fs';
import path from 'path';
import { TASKS_FILE, ACTIVITY_FILE, HEARTBEAT_FILE, OPENCLAW_JSON } from '../config.js';

// --- Tasks ---
export function readTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')); } catch { return []; }
}

export function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// --- Activity Log ---
export function readActivity() {
  try { return JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8')); } catch { return []; }
}

export function writeActivity(log) {
  while (log.length > 200) log.shift();
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(log, null, 2));
}

export function logActivity(actor, action, details = {}) {
  const log = readActivity();
  log.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), actor, action, details, timestamp: new Date().toISOString() });
  writeActivity(log);
}

// --- Heartbeat ---
export function readHeartbeat() {
  try { return JSON.parse(fs.readFileSync(HEARTBEAT_FILE, 'utf-8')); } catch { return { lastHeartbeat: null }; }
}

export function writeHeartbeat(data) {
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(data));
}

// --- OpenClaw JSON ---
export function readOpenclawJson() {
  try { return JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf-8')); } catch { return {}; }
}

export function writeOpenclawJson(data) {
  fs.writeFileSync(OPENCLAW_JSON, JSON.stringify(data, null, 2));
}

// --- History files ---
export function readHistoryFile(histPath) {
  try { return JSON.parse(fs.readFileSync(histPath, 'utf-8')); } catch { return []; }
}

export function appendHistory(histPath, content) {
  const history = readHistoryFile(histPath);
  history.push({ timestamp: new Date().toISOString(), content });
  while (history.length > 20) history.shift();
  fs.mkdirSync(path.dirname(histPath), { recursive: true });
  fs.writeFileSync(histPath, JSON.stringify(history, null, 2));
  return history;
}
