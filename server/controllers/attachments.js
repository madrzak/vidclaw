import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { readTasks, writeTasks } from '../lib/fileStore.js';
import { broadcast } from '../broadcast.js';
import { __dirname } from '../config.js';

const ATTACHMENTS_DIR = path.join(__dirname, 'data', 'attachments');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TASK_SIZE = 20 * 1024 * 1024; // 20MB

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/json',
  'application/zip', 'application/gzip',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

// Blocked file extensions (executables)
const BLOCKED_EXTENSIONS = new Set(['.exe', '.sh', '.bat', '.cmd', '.msi', '.com', '.scr', '.pif', '.ps1']);

/** Validate that an ID/filename param is safe (no path traversal) */
function isSafeParam(value) {
  return typeof value === 'string' && value.length > 0 && !value.includes('/') && !value.includes('\\') && !value.includes('..');
}

// Ensure attachments root exists
fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    if (!isSafeParam(req.params.id)) return cb(new Error('Invalid task ID'));
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

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error('File type not allowed'));
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('File type not allowed'));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
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
  if (!isSafeParam(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });

  const { tasks, idx, task } = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File exceeds 5MB limit' });
      if (err.message === 'File type not allowed') return res.status(400).json({ error: 'File type not allowed' });
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
  if (!isSafeParam(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  if (!isSafeParam(req.params.filename)) return res.status(400).json({ error: 'Invalid filename' });

  const { task } = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const filename = req.params.filename;
  const taskDir = path.resolve(path.join(ATTACHMENTS_DIR, req.params.id));
  const filePath = path.resolve(path.join(taskDir, filename));

  // Security: ensure resolved path stays within task dir
  if (!filePath.startsWith(taskDir + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  // Security headers to prevent XSS via uploaded HTML/SVG
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.sendFile(filePath);
}

export function deleteAttachment(req, res) {
  if (!isSafeParam(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  if (!isSafeParam(req.params.filename)) return res.status(400).json({ error: 'Invalid filename' });

  const tasks = readTasks();
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const task = tasks[idx];
  if (!Array.isArray(task.attachments)) task.attachments = [];

  const filename = req.params.filename;
  const ai = task.attachments.findIndex(a => a.filename === filename);
  if (ai === -1) return res.status(404).json({ error: 'Attachment not found' });

  // Remove file — verify path stays within task attachments dir
  const taskDir = path.resolve(path.join(ATTACHMENTS_DIR, req.params.id));
  const filePath = path.resolve(path.join(taskDir, filename));
  if (!filePath.startsWith(taskDir + path.sep)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  try { fs.unlinkSync(filePath); } catch {}

  task.attachments.splice(ai, 1);
  task.updatedAt = new Date().toISOString();
  writeTasks(tasks);
  broadcast('tasks', tasks.filter(t => t.status !== 'archived'));
  res.json({ ok: true });
}

export function listAttachments(req, res) {
  if (!isSafeParam(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
  const { task } = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task.attachments || []);
}

// Cleanup attachments dir when task is deleted
export function cleanupTaskAttachments(taskId) {
  const dir = path.join(ATTACHMENTS_DIR, taskId);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}
