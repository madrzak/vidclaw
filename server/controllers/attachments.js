import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { readTasks, writeTasks } from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';
import { __dirname } from '../config.js';

const ATTACHMENTS_DIR = path.join(__dirname, 'data', 'attachments');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TASK_SIZE = 20 * 1024 * 1024; // 20MB

// Ensure attachments root exists
fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(ATTACHMENTS_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Preserve original name but make unique with timestamp prefix
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${safe}`;
    cb(null, unique);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

function getTask(id) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === id);
  return { tasks, idx, task: idx !== -1 ? tasks[idx] : null };
}

function taskTotalSize(task) {
  if (!Array.isArray(task.attachments)) return 0;
  return task.attachments.reduce((sum, a) => sum + (a.size || 0), 0);
}

export function uploadAttachment(req, res) {
  const { tasks, idx, task } = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File exceeds 5MB limit' });
      return res.status(500).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    // Re-read tasks after multer (async)
    const freshTasks = readTasks();
    const fi = freshTasks.findIndex(t => t.id === req.params.id);
    if (fi === -1) return res.status(404).json({ error: 'Task not found' });
    const freshTask = freshTasks[fi];

    if (!Array.isArray(freshTask.attachments)) freshTask.attachments = [];

    // Check total size limit
    if (taskTotalSize(freshTask) + req.file.size > MAX_TASK_SIZE) {
      // Remove the uploaded file
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ error: 'Task attachments exceed 20MB total limit' });
    }

    const attachment = {
      name: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      addedAt: new Date().toISOString(),
    };
    freshTask.attachments.push(attachment);
    freshTask.updatedAt = new Date().toISOString();
    writeTasks(freshTasks);
    broadcast('tasks', freshTasks.filter(t => t.status !== 'archived'));
    res.json(attachment);
  });
}

export function serveAttachment(req, res) {
  const { task } = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const filename = req.params.filename;
  const filePath = path.join(ATTACHMENTS_DIR, req.params.id, filename);

  // Security: ensure we stay within task dir
  if (!filePath.startsWith(path.join(ATTACHMENTS_DIR, req.params.id))) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
}

export function deleteAttachment(req, res) {
  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const task = tasks[idx];
  if (!Array.isArray(task.attachments)) task.attachments = [];

  const filename = req.params.filename;
  const ai = task.attachments.findIndex(a => a.filename === filename);
  if (ai === -1) return res.status(404).json({ error: 'Attachment not found' });

  // Remove file
  const filePath = path.join(ATTACHMENTS_DIR, req.params.id, filename);
  try { fs.unlinkSync(filePath); } catch {}

  task.attachments.splice(ai, 1);
  task.updatedAt = new Date().toISOString();
  writeTasks(tasks);
  broadcast('tasks', tasks.filter(t => t.status !== 'archived'));
  res.json({ ok: true });
}

// Cleanup attachments dir when task is deleted
export function cleanupTaskAttachments(taskId) {
  const dir = path.join(ATTACHMENTS_DIR, taskId);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
