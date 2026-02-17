import { readActivity } from '../lib/fileStore.js';
import { getTimezone, getDatePartsInTz } from '../lib/timezone.js';

export function getActivity(req, res) {
  const log = readActivity();
  const limit = parseInt(req.query.limit) || 50;
  const taskId = req.query.taskId;
  const filtered = taskId ? log.filter(a => a.details?.taskId === taskId) : log;
  res.json(filtered.slice(-limit).reverse());
}

export function getTime(req, res) {
  const now = new Date();
  const tz = getTimezone();
  const p = getDatePartsInTz(now, tz);
  res.json({
    timezone: tz,
    iso: now.toISOString(),
    local: now.toLocaleString('en-US', { timeZone: tz }),
    weekday: p.weekday,
    year: p.year,
    month: p.month + 1,
    day: p.day,
    hour: p.hour,
    minute: p.minute,
    second: p.second,
  });
}
