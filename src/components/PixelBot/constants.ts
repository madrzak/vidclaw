export const C = {
  shell: '#dc2626',
  shellDark: '#991b1b',
  shellLight: '#ef4444',
  belly: '#fca5a5',
  eye: '#1e1e1e',
  eyeStalk: '#b91c1c',
  claw: '#dc2626',
  clawInner: '#f87171',
  antenna: '#f87171',
  desk: '#78716c',
  deskTop: '#a8a29e',
  screen: '#1e293b',
  screenGlow: '#34d399',
  floor: '#1c1917',
  star: '#fbbf24',
}

export const PIXEL = 6
export const WALK_SPEED = 0.3
export const FRAME_INTERVAL = 1000 / 30

export const STATE_LABELS = {
  idle: { text: '💤 Idle — Waiting for tasks...', color: 'text-zinc-400' },
  working: { text: '⚡ Working — Processing tasks!', color: 'text-amber-400' },
  celebrating: { text: '🎉 Done — Task completed!', color: 'text-green-400' },
}
