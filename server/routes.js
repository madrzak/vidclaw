import { Router } from 'express';
import path from 'path';
import { __dirname } from './config.js';

import { getActivity, getTime } from './controllers/activity.js';
import {
  listTasks, createTask, updateTask, reorderTasks,
  runTask, getTaskQueue, pickupTask, completeTask, deleteTask,
  getCalendar, getRunHistory, toggleSchedule,
} from './controllers/tasks.js';
import { getUsage } from './controllers/usage.js';
import { getOpenclawVersion, updateOpenclaw } from './controllers/openclaw.js';
import { listModels, setModel, getHeartbeat, postHeartbeat } from './controllers/models.js';
import { listSkills, toggleSkill, createSkill, getSkillContent, deleteSkill } from './controllers/skills.js';
import { listFiles, getFileContent, downloadFile, getWorkspaceFile, putWorkspaceFile, getWorkspaceFileHistory } from './controllers/files.js';
import { getSoul, putSoul, getSoulHistory, revertSoul, getSoulTemplates } from './controllers/soul.js';
import { getSettings, postSettings } from './controllers/settings.js';
import { getVidclawVersion, updateVidclaw } from './controllers/vidclaw.js';

const router = Router();

// Activity
router.get('/api/activity', getActivity);
router.get('/api/time', getTime);

// Tasks
router.get('/api/tasks', listTasks);
router.post('/api/tasks', createTask);
router.put('/api/tasks/:id', updateTask);
router.post('/api/tasks/reorder', reorderTasks);
router.post('/api/tasks/:id/run', runTask);
router.get('/api/tasks/queue', getTaskQueue);
router.post('/api/tasks/:id/pickup', pickupTask);
router.post('/api/tasks/:id/complete', completeTask);
router.get('/api/tasks/:id/history', getRunHistory);
router.post('/api/tasks/:id/schedule-toggle', toggleSchedule);
router.delete('/api/tasks/:id', deleteTask);
router.get('/api/calendar', getCalendar);

// Usage
router.get('/api/usage', getUsage);

// OpenClaw
router.get('/api/openclaw/version', getOpenclawVersion);
router.post('/api/openclaw/update', updateOpenclaw);

// Models & Heartbeat
router.get('/api/models', listModels);
router.post('/api/model', setModel);
router.get('/api/heartbeat', getHeartbeat);
router.post('/api/heartbeat', postHeartbeat);

// Skills
router.get('/api/skills', listSkills);
router.post('/api/skills/:id/toggle', toggleSkill);
router.post('/api/skills/create', createSkill);
router.get('/api/skills/:id/content', getSkillContent);
router.delete('/api/skills/:id', deleteSkill);

// Files & Workspace
router.get('/api/files', listFiles);
router.get('/api/files/content', getFileContent);
router.get('/api/files/download', downloadFile);
router.get('/api/workspace-file', getWorkspaceFile);
router.put('/api/workspace-file', putWorkspaceFile);
router.get('/api/workspace-file/history', getWorkspaceFileHistory);

// Soul
router.get('/api/soul', getSoul);
router.put('/api/soul', putSoul);
router.get('/api/soul/history', getSoulHistory);
router.post('/api/soul/revert', revertSoul);
router.get('/api/soul/templates', getSoulTemplates);

// Settings
router.get('/api/settings', getSettings);
router.post('/api/settings', postSettings);

// VidClaw
router.get('/api/vidclaw/version', getVidclawVersion);
router.post('/api/vidclaw/update', updateVidclaw);

// SPA fallback
router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

export default router;
