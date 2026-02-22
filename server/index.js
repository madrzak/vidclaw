import express from 'express';
import http from 'http';
import { HOST, PORT } from './config.js';
import { setupWebSocket, broadcast } from './broadcast.js';
import { setupMiddleware } from './middleware.js';
import router from './routes.js';
import { readTasks, writeTasks, logActivity } from './lib/fileStore.js';
import { computeNextRun } from './lib/schedule.js';

const app = express();
const server = http.createServer(app);

setupWebSocket(server);
setupMiddleware(app);
app.use(router);

if (HOST !== '127.0.0.1' && HOST !== 'localhost') {
  console.warn(
    `[WARN] HOST is set to ${HOST}. This exposes the dashboard beyond localhost unless restricted by firewall/network policy.`
  );
}

server.listen(PORT, HOST, () => {
  console.log(`Dashboard running at http://${HOST}:${PORT}`);
});

// Stale task recovery — every 5 minutes, auto-recover tasks stuck in-progress > 30 min
setInterval(() => {
  const tasks = readTasks();
  const now = new Date();
  let changed = false;
  for (const t of tasks) {
    if (t.status !== 'in-progress' || !t.pickedUp || !t.startedAt) continue;
    const elapsed = now - new Date(t.startedAt);
    if (elapsed < 30 * 60 * 1000) continue;

    const isoNow = now.toISOString();
    if (t.schedule && t.scheduleEnabled !== false) {
      if (!Array.isArray(t.runHistory)) t.runHistory = [];
      t.runHistory.push({ completedAt: isoNow, startedAt: t.startedAt, result: null, error: 'Stale task auto-recovered' });
      t.status = 'todo';
      t.scheduledAt = computeNextRun(t.schedule);
      t.error = 'Stale task auto-recovered';
    } else {
      t.status = 'done';
      t.completedAt = isoNow;
      t.error = 'Stale task auto-recovered — sub-agent unresponsive';
    }
    t.result = null;
    t.startedAt = null;
    t.subagentId = null;
    t.pickedUp = false;
    t.updatedAt = isoNow;
    logActivity('system', 'task_timeout', { taskId: t.id, title: t.title, message: 'Auto-recovered after 30min stale' });
    changed = true;
  }
  if (changed) {
    writeTasks(tasks);
    broadcast('tasks', tasks.filter(t => t.status !== 'archived'));
  }
}, 5 * 60 * 1000);
