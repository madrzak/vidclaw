import fs from 'fs';
import path from 'path';
import { readTasks, writeTasks, logActivity, readSettings } from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';
import { isoToDateInTz } from '../lib/timezone.js';
import { WORKSPACE, __dirname } from '../config.js';
import { computeNextRun, computeFutureRuns } from '../lib/schedule.js';
import { getKnownChannelIds } from './channels.js';

export function listTasks(req, res) {
  let tasks = readTasks();
  const includeArchived = req.query.includeArchived === 'true';
  if (!includeArchived) tasks = tasks.filter(t => t.status !== 'archived');
  // Filter by channel if ?channel= query param is provided
  if (req.query.channel !== undefined) {
    const ch = req.query.channel || null;
    tasks = tasks.filter(t => (t.channel || null) === ch);
  }
  res.json(tasks);
}

/** Validate channel value against known channel IDs. Returns error string or null. */
function validateChannel(channel) {
  if (channel === null || channel === undefined || channel === '') return null;
  const known = getKnownChannelIds();
  if (!known.includes(channel)) return `Unknown channel "${channel}". Valid: ${known.join(', ')}`;
  return null;
}

export function createTask(req, res) {
  const channelErr = validateChannel(req.body.channel);
  if (channelErr) return res.status(400).json({ error: channelErr });
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
    channel: req.body.channel || null,
    order: req.body.order ?? tasks.filter(t => t.status === (req.body.status || 'backlog')).length,
  };
  tasks.push(task);
  writeTasks(tasks);
  logActivity('user', 'task_created', { taskId: task.id, title: task.title });
  broadcast('tasks', tasks);
  res.json(task);
}

export function updateTask(req, res) {
  if (req.body.channel !== undefined) {
    const channelErr = validateChannel(req.body.channel);
    if (channelErr) return res.status(400).json({ error: channelErr });
  }
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const wasNotDone = tasks[idx].status !== 'done';
  const allowedFields = ['title', 'description', 'priority', 'skill', 'skills', 'status', 'schedule', 'scheduledAt', 'scheduleEnabled', 'result', 'startedAt', 'completedAt', 'error', 'order', 'subagentId', 'channel'];
  const updates = {};
  for (const k of allowedFields) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  // Recompute scheduledAt when schedule changes
  if (updates.schedule !== undefined) {
    if (updates.schedule) {
      tasks[idx].scheduledAt = computeNextRun(updates.schedule);
      tasks[idx].scheduleEnabled = true;
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

  const settings = readSettings();
  const maxConcurrent = settings.maxConcurrent || 1;
  const activeCount = tasks.filter(t => t.status === 'in-progress' && t.pickedUp).length;
  const remainingSlots = Math.max(0, maxConcurrent - activeCount);

  const limitedQueue = req.query.limit === 'capacity' ? queue.slice(0, remainingSlots) : queue;
  res.json({ tasks: limitedQueue, maxConcurrent, activeCount, remainingSlots });
}

export function pickupTask(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  tasks[idx].pickedUp = true;
  tasks[idx].status = 'in-progress';
  tasks[idx].startedAt = tasks[idx].startedAt || new Date().toISOString();
  tasks[idx].updatedAt = new Date().toISOString();
  if (req.body.subagentId) tasks[idx].subagentId = req.body.subagentId;
  writeTasks(tasks);
  logActivity('bot', 'task_pickup', { taskId: req.params.id, title: tasks[idx].title, subagentId: req.body.subagentId || null });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
}

export function completeTask(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const hasError = !!req.body.error;

  // If recurring, save run to history and reschedule instead of marking done
  if (tasks[idx].schedule && tasks[idx].scheduleEnabled !== false) {
    if (!Array.isArray(tasks[idx].runHistory)) tasks[idx].runHistory = [];
    tasks[idx].runHistory.push({
      completedAt: now,
      startedAt: tasks[idx].startedAt,
      result: req.body.result || null,
      error: req.body.error || null,
    });
    tasks[idx].status = 'todo';
    tasks[idx].scheduledAt = computeNextRun(tasks[idx].schedule);
    tasks[idx].result = req.body.result || null;
    tasks[idx].error = req.body.error || null;
    tasks[idx].startedAt = null;
    tasks[idx].completedAt = null;
    tasks[idx].subagentId = null;
    tasks[idx].pickedUp = false;
    tasks[idx].updatedAt = now;
  } else {
    tasks[idx].status = 'done';
    tasks[idx].completedAt = now;
    tasks[idx].updatedAt = now;
    tasks[idx].result = req.body.result || null;
    tasks[idx].subagentId = null;
    tasks[idx].pickedUp = false;
    if (hasError) tasks[idx].error = req.body.error;
  }
  writeTasks(tasks);
  logActivity('bot', 'task_completed', { taskId: req.params.id, title: tasks[idx].title, hasError });
  broadcast('tasks', tasks);
  res.json(tasks[idx]);
}

export function bulkDeleteTasks(req, res) {
  const tasks = readTasks();
  const { status, ids } = req.body;
  let targets;
  if (Array.isArray(ids) && ids.length) {
    targets = tasks.filter(t => ids.includes(t.id) && t.status !== 'archived');
  } else if (status) {
    targets = tasks.filter(t => t.status === status);
  } else {
    return res.status(400).json({ error: 'Provide status or ids[]' });
  }
  const now = new Date().toISOString();
  for (const t of targets) {
    t.previousStatus = t.status;
    t.status = 'archived';
    t.archivedAt = now;
    t.updatedAt = now;
  }
  writeTasks(tasks);
  for (const t of targets) {
    logActivity('user', 'task_archived', { taskId: t.id, title: t.title });
  }
  broadcast('tasks', tasks.filter(t => t.status !== 'archived'));
  res.json({ ok: true, archived: targets.length });
}

export function deleteTask(req, res) {
  const tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.status = 'archived';
  task.archivedAt = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  writeTasks(tasks);
  logActivity('user', 'task_archived', { taskId: task.id, title: task.title });
  // Cleanup attachments directory
  const attDir = path.join(__dirname, 'data', 'attachments', req.params.id);
  try { fs.rmSync(attDir, { recursive: true, force: true }); } catch {}
  broadcast('tasks', tasks.filter(t => t.status !== 'archived'));
  res.json({ ok: true });
}

export function getCalendar(req, res) {
  const memoryDir = path.join(WORKSPACE, 'memory');
  const data = {};
  const initDay = (d) => { data[d] = data[d] || { memory: false, tasks: [], scheduled: [] }; };
  try {
    const files = fs.readdirSync(memoryDir).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f));
    for (const f of files) {
      const date = f.replace('.md', '');
      initDay(date);
      try {
        const content = fs.readFileSync(path.join(memoryDir, f), 'utf8').trim();
        const firstLine = content.split('\n').find(l => l.trim() && !l.startsWith('#')) || content.split('\n')[0] || '';
        data[date].memory = firstLine.replace(/^[#\-*>\s]+/, '').trim().slice(0, 120) || true;
      } catch {
        data[date].memory = true;
      }
    }
  } catch {}
  const tasks = readTasks();
  for (const t of tasks) {
    // Completed tasks (including recurring run history)
    if (t.completedAt) {
      const date = isoToDateInTz(t.completedAt);
      initDay(date);
      data[date].tasks.push(t.title);
    }
    // Run history entries from recurring tasks
    if (Array.isArray(t.runHistory)) {
      for (const run of t.runHistory) {
        if (run.completedAt) {
          const date = isoToDateInTz(run.completedAt);
          initDay(date);
          data[date].tasks.push(t.title + (run.error ? ' ⚠' : ''));
        }
      }
    }
    // Scheduled / upcoming tasks — project future runs for recurring schedules
    if (t.schedule && t.scheduleEnabled !== false && t.status !== 'done') {
      try {
        const runs = computeFutureRuns(t.schedule, 90);
        for (const run of runs) {
          const date = isoToDateInTz(run);
          initDay(date);
          if (!data[date].scheduled.includes(t.title)) data[date].scheduled.push(t.title);
        }
      } catch {}
      // Also include the immediate next run if not covered
      if (t.scheduledAt) {
        try {
          const date = isoToDateInTz(new Date(t.scheduledAt).toISOString());
          initDay(date);
          if (!data[date].scheduled.includes(t.title)) data[date].scheduled.push(t.title);
        } catch {}
      }
    } else if (t.scheduledAt && t.status !== 'done') {
      // One-off scheduledAt without recurring schedule
      try {
        const date = isoToDateInTz(new Date(t.scheduledAt).toISOString());
        initDay(date);
        data[date].scheduled.push(t.title);
      } catch {}
    }
  }
  res.json(data);
}

export function getRunHistory(req, res) {
  const tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task.runHistory || []);
}

export function getCapacity(req, res) {
  const tasks = readTasks();
  const settings = readSettings();
  const maxConcurrent = settings.maxConcurrent || 1;
  const activeCount = tasks.filter(t => t.status === 'in-progress' && t.pickedUp).length;
  const remainingSlots = Math.max(0, maxConcurrent - activeCount);
  res.json({ maxConcurrent, activeCount, remainingSlots });
}

export function reportStatusCheck(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { status, message } = req.body;
  const validStatuses = ['running', 'completed', 'failed', 'timeout'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be one of: ' + validStatuses.join(', ') });
  }

  logActivity('bot', 'task_status_check', { taskId: req.params.id, title: tasks[idx].title, status, message: message || null });

  if (status === 'completed' || status === 'failed' || status === 'timeout') {
    const now = new Date().toISOString();
    const errorMsg = status === 'completed' ? null : (message || (status === 'timeout' ? 'Task timed out' : 'Task failed'));

    if (tasks[idx].schedule && tasks[idx].scheduleEnabled !== false) {
      if (!Array.isArray(tasks[idx].runHistory)) tasks[idx].runHistory = [];
      tasks[idx].runHistory.push({
        completedAt: now,
        startedAt: tasks[idx].startedAt,
        result: status === 'completed' ? (message || null) : null,
        error: errorMsg,
      });
      tasks[idx].status = 'todo';
      tasks[idx].scheduledAt = computeNextRun(tasks[idx].schedule);
      tasks[idx].result = status === 'completed' ? (message || null) : null;
      tasks[idx].error = errorMsg;
      tasks[idx].startedAt = null;
      tasks[idx].completedAt = null;
      tasks[idx].subagentId = null;
      tasks[idx].pickedUp = false;
      tasks[idx].updatedAt = now;
    } else {
      tasks[idx].status = 'done';
      tasks[idx].completedAt = now;
      tasks[idx].updatedAt = now;
      tasks[idx].result = status === 'completed' ? (message || null) : null;
      tasks[idx].error = errorMsg;
      tasks[idx].subagentId = null;
      tasks[idx].pickedUp = false;
    }
    writeTasks(tasks);
    if (status !== 'completed') logActivity('bot', 'task_timeout', { taskId: req.params.id, title: tasks[idx].title, message: message || null });
    broadcast('tasks', tasks);
    return res.json(tasks[idx]);
  }

  // status === 'running' — just log, no state change
  res.json({ ok: true, status: 'running' });
}

export function toggleSchedule(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks[idx].scheduleEnabled = !tasks[idx].scheduleEnabled;
  tasks[idx].updatedAt = new Date().toISOString();
  writeTasks(tasks);
  logActivity({ type: tasks[idx].scheduleEnabled ? 'schedule-resumed' : 'schedule-paused', taskId: tasks[idx].id, title: tasks[idx].title, actor: 'user' });
  broadcast({ type: 'task-updated', task: tasks[idx] });
  res.json(tasks[idx]);
}
