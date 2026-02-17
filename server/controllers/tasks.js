import fs from 'fs';
import path from 'path';
import { readTasks, writeTasks, logActivity } from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';
import { isoToDateInTz } from '../lib/timezone.js';
import { WORKSPACE } from '../config.js';

export function listTasks(req, res) {
  res.json(readTasks());
}

export function createTask(req, res) {
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
    scheduledAt: req.body.schedule ? (req.body.scheduledAt || computeNextRun(req.body.schedule)) : (req.body.scheduledAt || null),
    scheduleEnabled: req.body.schedule ? true : false,
    runHistory: [],
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
}

export function updateTask(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const wasNotDone = tasks[idx].status !== 'done';
  const allowedFields = ['title', 'description', 'priority', 'skill', 'skills', 'status', 'schedule', 'scheduledAt', 'scheduleEnabled', 'result', 'startedAt', 'completedAt', 'error', 'order'];
  const updates = {};
  for (const k of allowedFields) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  // Recompute scheduledAt when schedule changes
  if (updates.schedule !== undefined) {
    if (updates.schedule) {
      tasks[idx].scheduledAt = computeNextRun(updates.schedule);
      if (tasks[idx].scheduleEnabled === undefined) tasks[idx].scheduleEnabled = true;
    } else {
      tasks[idx].scheduledAt = null;
      tasks[idx].scheduleEnabled = false;
    }
  }
  if (wasNotDone && tasks[idx].status === 'done') tasks[idx].completedAt = new Date().toISOString();
  if (tasks[idx].status !== 'done') tasks[idx].completedAt = null;
  writeTasks(tasks);
  const actor = req.body._actor || 'user';
  logActivity(actor, 'task_updated', { taskId: req.params.id, title: tasks[idx].title, changes: Object.keys(updates) });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
}

export function reorderTasks(req, res) {
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
}

export function runTask(req, res) {
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
}

export function getTaskQueue(req, res) {
  const tasks = readTasks();
  const now = new Date();
  const queue = tasks.filter(t => {
    if (t.status === 'in-progress' && !t.pickedUp) return true;
    if (t.status !== 'todo') return false;
    // Paused recurring tasks shouldn't enter queue
    if (t.schedule && t.scheduleEnabled === false) return false;
    if (!t.schedule) return true;
    if (t.schedule === 'asap' || t.schedule === 'next-heartbeat') return true;
    // Check scheduledAt for recurring tasks
    if (t.scheduledAt) return new Date(t.scheduledAt) <= now;
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
}

export function pickupTask(req, res) {
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
}

export function completeTask(req, res) {
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
}

export function deleteTask(req, res) {
  let tasks = readTasks();
  const deleted = tasks.find(t => t.id === req.params.id);
  tasks = tasks.filter(t => t.id !== req.params.id);
  writeTasks(tasks);
  if (deleted) logActivity('user', 'task_deleted', { taskId: req.params.id, title: deleted.title });
  broadcast('tasks', tasks);
  res.json({ ok: true });
}

export function getCalendar(req, res) {
  const memoryDir = path.join(WORKSPACE, 'memory');
  const data = {};
  try {
    const files = fs.readdirSync(memoryDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    for (const f of files) {
      const date = f.replace('.md', '');
      data[date] = data[date] || { memory: false, tasks: [], scheduled: [] };
      data[date].memory = true;
    }
  } catch {}
  const tasks = readTasks();
  for (const t of tasks) {
    // Completed tasks
    if (t.completedAt) {
      const date = isoToDateInTz(t.completedAt);
      data[date] = data[date] || { memory: false, tasks: [], scheduled: [] };
      data[date].tasks.push(t.title);
    }
    // Scheduled / upcoming tasks (scheduledAt or future schedule dates)
    const schedDate = t.scheduledAt || (t.schedule && t.schedule !== 'asap' && t.schedule !== 'next-heartbeat' ? t.schedule : null);
    if (schedDate && t.status !== 'done') {
      try {
        const date = isoToDateInTz(new Date(schedDate).toISOString());
        data[date] = data[date] || { memory: false, tasks: [], scheduled: [] };
        data[date].scheduled.push(t.title);
      } catch {}
    }
  }
  res.json(data);
}
