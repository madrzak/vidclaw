import { readOpenclawJson } from './fileStore.js';

export function getTimezone() {
  try {
    const config = readOpenclawJson();
    return config.agents?.defaults?.timezone || 'UTC';
  } catch { return 'UTC'; }
}

export function getDatePartsInTz(date = new Date(), tz = getTimezone()) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    weekday: 'long',
  }).formatToParts(date).forEach(p => { parts[p.type] = p.value; });
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month) - 1,
    day: parseInt(parts.day),
    hour: parts.hour === '24' ? 0 : parseInt(parts.hour),
    minute: parseInt(parts.minute),
    second: parseInt(parts.second),
    weekday: parts.weekday,
  };
}

export function startOfDayInTz(date = new Date(), tz = getTimezone()) {
  const p = getDatePartsInTz(date, tz);
  const utcNow = date.getTime();
  const localNow = new Date(p.year, p.month, p.day, p.hour, p.minute, p.second).getTime();
  const offset = utcNow - localNow;
  return new Date(new Date(p.year, p.month, p.day, 0, 0, 0, 0).getTime() + offset);
}

export function startOfWeekInTz(date = new Date(), tz = getTimezone()) {
  const p = getDatePartsInTz(date, tz);
  const d = new Date(p.year, p.month, p.day);
  const dayOfWeek = d.getDay();
  const weekStartLocal = new Date(p.year, p.month, p.day - dayOfWeek);
  const utcNow = date.getTime();
  const localNow = new Date(p.year, p.month, p.day, p.hour, p.minute, p.second).getTime();
  const offset = utcNow - localNow;
  return new Date(weekStartLocal.getTime() + offset);
}

export function startOfMonthInTz(date = new Date(), tz = getTimezone()) {
  const p = getDatePartsInTz(date, tz);
  const utcNow = date.getTime();
  const localNow = new Date(p.year, p.month, p.day, p.hour, p.minute, p.second).getTime();
  const offset = utcNow - localNow;
  return new Date(new Date(p.year, p.month, 1, 0, 0, 0, 0).getTime() + offset);
}

export function isoToDateInTz(isoStr, tz = getTimezone()) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}
