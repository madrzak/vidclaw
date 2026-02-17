import fs from 'fs';
import path from 'path';
import { OPENCLAW_DIR } from '../config.js';
import { readOpenclawJson } from '../lib/fileStore.js';
import {
  getTimezone, startOfDayInTz, startOfWeekInTz, startOfMonthInTz,
} from '../lib/timezone.js';
import { formatDuration } from '../lib/format.js';

export function getUsage(req, res) {
  const now = new Date();
  const sessionsDir = path.join(OPENCLAW_DIR, 'agents', 'main', 'sessions');

  let tokensToday = 0, tokensWeek = 0, tokensMonth = 0;
  let costToday = 0, costWeek = 0, costMonth = 0;
  const sessionsToday = new Set(), sessionsWeek = new Set(), sessionsMonth = new Set();

  const tz = getTimezone();
  const todayStart = startOfDayInTz(now, tz);
  const weekStart = startOfWeekInTz(now, tz);
  const monthStart = startOfMonthInTz(now, tz);

  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime < monthStart) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const usage = entry.message?.usage || entry.usage;
          if (usage?.cost?.total) {
            const tokens = (usage.input || 0) + (usage.output || 0) + (usage.cacheRead || 0);
            const cost = usage.cost.total;
            const ts = new Date(entry.timestamp || stat.mtime);

            if (ts >= monthStart) { tokensMonth += tokens; costMonth += cost; sessionsMonth.add(file); }
            if (ts >= weekStart) { tokensWeek += tokens; costWeek += cost; sessionsWeek.add(file); }
            if (ts >= todayStart) { tokensToday += tokens; costToday += cost; sessionsToday.add(file); }
          }
        } catch {}
      }
    }
  } catch {}

  const tomorrowReset = new Date(todayStart); tomorrowReset.setDate(tomorrowReset.getDate() + 1);
  const nextWeekReset = new Date(weekStart); nextWeekReset.setDate(nextWeekReset.getDate() + 7);
  const nextMonthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const sessionWindowStart = new Date(now - 5 * 3600000);
  let tokensSession = 0, costSession = 0;
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const filePath = path.join(sessionsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtime < sessionWindowStart) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line);
          const u = entry.message?.usage || entry.usage;
          if (u?.cost?.total) {
            const ts = new Date(entry.timestamp || stat.mtime);
            if (ts >= sessionWindowStart) {
              tokensSession += (u.input || 0) + (u.output || 0) + (u.cacheRead || 0);
              costSession += u.cost.total;
            }
          }
        } catch {}
      }
    }
  } catch {}

  const sessionResetTime = new Date(sessionWindowStart.getTime() + 5 * 3600000);
  const sessionResetIn = formatDuration(Math.max(0, sessionResetTime - now));

  const config = readOpenclawJson();
  const model = (config.agents?.defaults?.model?.primary || 'unknown').replace('anthropic/', '');

  const SESSION_LIMIT = 45000000;
  const WEEKLY_LIMIT = 180000000;

  const sessionPct = Math.min(100, Math.round((tokensSession / SESSION_LIMIT) * 100));
  const weeklyPct = Math.min(100, Math.round((tokensWeek / WEEKLY_LIMIT) * 100));

  res.json({
    model,
    timezone: tz,
    tiers: [
      {
        label: 'Current session',
        percent: sessionPct,
        resetsIn: sessionResetIn,
        tokens: tokensSession,
        cost: costSession,
      },
      {
        label: 'Current week (all models)',
        percent: weeklyPct,
        resetsIn: formatDuration(nextWeekReset - now),
        tokens: tokensWeek,
        cost: costWeek,
      },
    ],
    details: {
      today: { tokens: tokensToday, cost: costToday, sessions: sessionsToday.size },
      week: { tokens: tokensWeek, cost: costWeek, sessions: sessionsWeek.size },
      month: { tokens: tokensMonth, cost: costMonth, sessions: sessionsMonth.size },
    },
  });
}
