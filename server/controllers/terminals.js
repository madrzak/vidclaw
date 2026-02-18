import pty from 'node-pty';
import os from 'os';

const terminals = new Map();
const terminalOutput = new Map();

const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh';

export function listTerminals(req, res) {
  const list = [];
  for (const [id] of terminals) {
    list.push({ id, alive: true });
  }
  res.json(list);
}

export function createTerminal(req, res) {
  const id = req.body.id || `term-${Date.now()}`;
  const cols = req.body.cols || 80;
  const rows = req.body.rows || 24;

  if (terminals.has(id)) {
    return res.json({ id, success: true, existing: true });
  }

  const term = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color' },
  });

  terminals.set(id, term);
  terminalOutput.set(id, '');

  term.onData((data) => {
    const buf = terminalOutput.get(id) || '';
    terminalOutput.set(id, buf + data);
  });

  term.onExit(() => {
    terminals.delete(id);
  });

  res.json({ id, success: true });
}

export function getTerminalOutput(req, res) {
  const { id } = req.params;
  const output = terminalOutput.get(id) || '';
  terminalOutput.set(id, '');

  res.json({
    output,
    exited: !terminals.has(id) && output === '',
  });
}

export function sendTerminalInput(req, res) {
  const { id } = req.params;
  const { data } = req.body;
  const term = terminals.get(id);

  if (!term) {
    return res.status(404).json({ error: 'Terminal not found' });
  }

  term.write(data);
  res.json({ success: true });
}

export function resizeTerminal(req, res) {
  const { id } = req.params;
  const { cols, rows } = req.body;
  const term = terminals.get(id);

  if (!term) {
    return res.status(404).json({ error: 'Terminal not found' });
  }

  if (cols && rows) {
    term.resize(cols, rows);
  }

  res.json({ success: true });
}

export function deleteTerminal(req, res) {
  const { id } = req.params;
  const term = terminals.get(id);

  if (term) {
    term.kill();
    terminals.delete(id);
    terminalOutput.delete(id);
  }

  res.json({ success: true });
}
