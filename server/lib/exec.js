import { exec as execCb } from 'child_process';

export const exec = (cmd) => new Promise((resolve, reject) => {
  execCb(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve(stdout.trim());
  });
});

export function compareSemver(a, b) {
  // Split on '.' and '-' to handle versions like "2026.3.23-2"
  const pa = a.split(/[.\-]/).map(Number);
  const pb = b.split(/[.\-]/).map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}
