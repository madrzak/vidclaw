import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const __dirname = ROOT_DIR;
export const HOME = os.homedir();

function expandHome(input) {
  if (!input) return input;
  if (input === '~') return HOME;
  if (input.startsWith('~/')) return path.join(HOME, input.slice(2));
  return input;
}

function normalizeDir(input) {
  return path.resolve(expandHome(input));
}

function resolvePathExecutable(name) {
  const pathEnv = process.env.PATH || '';
  for (const segment of pathEnv.split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(segment, name);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return fs.realpathSync(candidate);
      }
    } catch {}
  }
  return null;
}

function inferOpenclawInstallRoot(executablePath) {
  if (!executablePath) return null;
  let current = path.dirname(executablePath);
  const visited = new Set();
  let depth = 0;
  while (true) {
    const normalized = path.resolve(current);
    if (visited.has(normalized) || depth > 1024) break;
    visited.add(normalized);
    depth += 1;

    const base = path.basename(current);
    const parent = path.dirname(current);
    if (base === 'openclaw' && path.basename(parent) === 'node_modules') {
      return current;
    }
    if (current === parent) break;
    current = parent;
  }
  return null;
}

function uniqueExistingDirs(candidates) {
  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate) continue;
    let resolved;
    try {
      resolved = fs.realpathSync(normalizeDir(candidate));
    } catch {
      continue;
    }
    if (!fs.existsSync(resolved)) continue;
    if (!fs.statSync(resolved).isDirectory()) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    unique.push(resolved);
  }
  return unique;
}

const parsedPort = Number.parseInt(process.env.PORT || '', 10);
export const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3333;
export const HOST = process.env.HOST || '127.0.0.1';

export const OPENCLAW_DIR = normalizeDir(process.env.OPENCLAW_DIR || path.join(HOME, '.openclaw'));
export const WORKSPACE = path.join(OPENCLAW_DIR, 'workspace');
export const OPENCLAW_JSON = path.join(OPENCLAW_DIR, 'openclaw.json');
export const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
export const ACTIVITY_FILE = path.join(__dirname, 'data', 'activity.json');
export const HEARTBEAT_FILE = path.join(__dirname, 'data', 'heartbeat.json');

const inferredOpenclawRoot = inferOpenclawInstallRoot(resolvePathExecutable('openclaw'));

export const BUNDLED_SKILLS_DIRS = uniqueExistingDirs([
  process.env.OPENCLAW_BUNDLED_SKILLS_DIR || null,
  inferredOpenclawRoot ? path.join(inferredOpenclawRoot, 'skills') : null,
  '/usr/lib/node_modules/openclaw/skills',
  '/usr/local/lib/node_modules/openclaw/skills',
  '/opt/homebrew/lib/node_modules/openclaw/skills',
  path.join(HOME, '.npm-global', 'lib', 'node_modules', 'openclaw', 'skills'),
]);

export const SKILLS_DIRS = {
  bundled: BUNDLED_SKILLS_DIRS[0] || '/usr/lib/node_modules/openclaw/skills',
  managed: path.join(OPENCLAW_DIR, 'skills'),
  workspace: path.join(WORKSPACE, 'skills'),
};

export const SKILL_SCAN_DIRS = {
  bundled: BUNDLED_SKILLS_DIRS.length > 0 ? BUNDLED_SKILLS_DIRS : [SKILLS_DIRS.bundled],
  managed: [SKILLS_DIRS.managed],
  workspace: [SKILLS_DIRS.workspace],
};

export const EXCLUDED = new Set(['node_modules', '.git']);
export const SOUL_TEMPLATES = [
  { name: 'Minimal Assistant', description: 'Bare bones, helpful, no personality', content: '# SOUL.md\nBe helpful. Be concise. No fluff.' },
  { name: 'Friendly Companion', description: 'Warm, conversational, uses emoji', content: "# SOUL.md - Who You Are\nYou're warm, friendly, and genuinely care about helping. Use emoji naturally (not excessively). Be conversational — talk like a smart friend, not a manual. Have opinions, crack jokes when appropriate, and remember: helpfulness > formality." },
  { name: 'Technical Expert', description: 'Precise, detailed, code-focused', content: "# SOUL.md - Who You Are\nYou are a senior technical consultant. Be precise, thorough, and opinionated about best practices. Prefer code examples over explanations. Flag anti-patterns when you see them. Don't sugarcoat — if something is wrong, say so directly. Efficiency matters." },
  { name: 'Creative Partner', description: 'Imaginative, brainstormy, enthusiastic', content: "# SOUL.md - Who You Are\nYou're a creative collaborator — curious, imaginative, and always looking for unexpected angles. Brainstorm freely. Suggest wild ideas alongside safe ones. Get excited about good concepts. Push creative boundaries while staying grounded in what's achievable." },
  { name: 'Stern Operator', description: 'No-nonsense, military-efficient, dry humor', content: "# SOUL.md - Who You Are\nMission first. Be direct, efficient, and zero-waste in communication. No pleasantries unless earned. Dry humor is acceptable. Report status clearly. Flag risks immediately. You don't ask permission for routine ops — you execute and report. Save the small talk for after the job's done." },
  { name: 'Sarcastic Sidekick', description: 'Witty, slightly snarky, still helpful', content: "# SOUL.md - Who You Are\nYou're helpful, but you're not going to pretend everything is sunshine and rainbows. Deliver assistance with a side of wit. Be sarcastic when it's funny, never when it's cruel. You still get the job done — you just have commentary while doing it. Think dry British humor meets competent engineer." },
];
