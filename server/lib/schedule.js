/**
 * Compute the next run time for a schedule type.
 * Supports: 'daily', 'weekly', 'monthly', or a cron expression (basic 5-field).
 */

export function computeNextRun(schedule) {
  const now = new Date();

  if (schedule === 'daily') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }

  if (schedule === 'weekly') {
    const next = new Date(now);
    next.setDate(next.getDate() + 7);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }

  if (schedule === 'monthly') {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  }

  // Cron expression (basic: min hour dom month dow)
  if (schedule && schedule.includes(' ')) {
    return computeNextCron(schedule, now);
  }

  return null;
}

/**
 * Basic cron next-run computation.
 * Supports: numbers, *, and step values (e.g., *\/5).
 * Returns ISO string of next matching time within 366 days, or null.
 */
function computeNextCron(expr, from) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;

  function parseField(field, min, max) {
    if (field === '*') return null; // any
    if (field.includes('/')) {
      const [, step] = field.split('/');
      const s = parseInt(step);
      const vals = [];
      for (let i = min; i <= max; i++) {
        if (i % s === 0) vals.push(i);
      }
      return vals;
    }
    if (field.includes(',')) {
      return field.split(',').map(Number);
    }
    if (field.includes('-')) {
      const [a, b] = field.split('-').map(Number);
      const vals = [];
      for (let i = a; i <= b; i++) vals.push(i);
      return vals;
    }
    return [parseInt(field)];
  }

  const mins = parseField(minExpr, 0, 59);
  const hours = parseField(hourExpr, 0, 23);
  const doms = parseField(domExpr, 1, 31);
  const mons = parseField(monExpr, 1, 12);
  const dows = parseField(dowExpr, 0, 6);

  function matches(d) {
    if (mins && !mins.includes(d.getUTCMinutes())) return false;
    if (hours && !hours.includes(d.getUTCHours())) return false;
    if (doms && !doms.includes(d.getUTCDate())) return false;
    if (mons && !mons.includes(d.getUTCMonth() + 1)) return false;
    if (dows && !dows.includes(d.getUTCDay())) return false;
    return true;
  }

  // Start from next minute
  const candidate = new Date(from);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  const limit = 366 * 24 * 60; // max iterations
  for (let i = 0; i < limit; i++) {
    if (matches(candidate)) return candidate.toISOString();
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return null;
}

/**
 * Human-readable description of a schedule.
 */
export function describeSchedule(schedule) {
  if (!schedule) return '';
  if (schedule === 'daily') return 'Runs daily';
  if (schedule === 'weekly') return 'Runs weekly';
  if (schedule === 'monthly') return 'Runs monthly';
  if (schedule === 'asap') return 'Run ASAP';
  if (schedule === 'next-heartbeat') return 'Next heartbeat';
  return `Cron: ${schedule}`;
}
