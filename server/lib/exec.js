import { exec as execCb } from 'child_process';

export const exec = (cmd) => new Promise((resolve, reject) => {
  execCb(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve(stdout.trim());
  });
});

export function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
  }
  return 0;
}
