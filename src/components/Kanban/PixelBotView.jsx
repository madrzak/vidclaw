import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../../hooks/useSocket.jsx'

// Pixel art bot colors
const C = {
  body: '#6366f1',      // indigo
  bodyDark: '#4338ca',
  eye: '#22d3ee',        // cyan
  eyeDark: '#0e7490',
  mouth: '#f472b6',      // pink
  antenna: '#a78bfa',    // purple
  desk: '#78716c',       // stone
  deskTop: '#a8a29e',
  screen: '#1e293b',     // slate
  screenGlow: '#34d399', // emerald
  floor: '#292524',
  wall: '#1c1917',
  star: '#fbbf24',       // amber
  confetti: ['#f43f5e', '#6366f1', '#22d3ee', '#fbbf24', '#34d399', '#f472b6'],
}

const PIXEL = 6

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x * PIXEL, y * PIXEL, w * PIXEL - 1, h * PIXEL - 1)
}

// Bot body shape (centered around cx, cy)
function drawBot(ctx, cx, cy, frame, state) {
  const bob = state === 'working' ? Math.sin(frame * 0.15) * 2 : 
              state === 'celebrating' ? Math.sin(frame * 0.3) * 3 : 
              Math.sin(frame * 0.05) * 1
  const y = cy + Math.round(bob)

  // Antenna
  const antennaWave = Math.sin(frame * 0.1) * 1
  drawPixelRect(ctx, cx, y - 10 + Math.round(antennaWave), 1, 1, C.star)
  drawPixelRect(ctx, cx, y - 9, 1, 2, C.antenna)

  // Head
  drawPixelRect(ctx, cx - 4, y - 7, 9, 7, C.body)
  drawPixelRect(ctx, cx - 3, y - 8, 7, 1, C.body)

  // Eyes
  const blink = frame % 60 < 3
  if (!blink) {
    drawPixelRect(ctx, cx - 2, y - 5, 2, 2, C.eye)
    drawPixelRect(ctx, cx + 1, y - 5, 2, 2, C.eye)
    // Pupils
    const lookX = state === 'working' ? Math.round(Math.sin(frame * 0.08)) : 0
    drawPixelRect(ctx, cx - 2 + lookX, y - 5, 1, 1, C.eyeDark)
    drawPixelRect(ctx, cx + 1 + lookX, y - 5, 1, 1, C.eyeDark)
  } else {
    drawPixelRect(ctx, cx - 2, y - 4, 2, 1, C.eye)
    drawPixelRect(ctx, cx + 1, y - 4, 2, 1, C.eye)
  }

  // Mouth
  if (state === 'celebrating') {
    drawPixelRect(ctx, cx - 1, y - 2, 3, 1, C.mouth)
    drawPixelRect(ctx, cx - 2, y - 3, 1, 1, C.mouth)
    drawPixelRect(ctx, cx + 2, y - 3, 1, 1, C.mouth)
  } else if (state === 'working') {
    drawPixelRect(ctx, cx - 1, y - 2, 3, 1, C.mouth)
  } else {
    drawPixelRect(ctx, cx - 1, y - 2, 2, 1, C.mouth)
  }

  // Body
  drawPixelRect(ctx, cx - 3, y, 7, 5, C.body)
  drawPixelRect(ctx, cx - 4, y + 1, 1, 3, C.bodyDark) // left arm
  drawPixelRect(ctx, cx + 4, y + 1, 1, 3, C.bodyDark) // right arm

  // Arms animation
  if (state === 'working') {
    const armUp = Math.sin(frame * 0.2) > 0
    drawPixelRect(ctx, cx - 5, y + (armUp ? 0 : 2), 1, 2, C.bodyDark)
    drawPixelRect(ctx, cx + 5, y + (armUp ? 2 : 0), 1, 2, C.bodyDark)
  } else if (state === 'celebrating') {
    drawPixelRect(ctx, cx - 5, y - 1 + Math.round(Math.sin(frame * 0.3)), 1, 2, C.bodyDark)
    drawPixelRect(ctx, cx + 5, y - 1 + Math.round(Math.cos(frame * 0.3)), 1, 2, C.bodyDark)
  } else {
    drawPixelRect(ctx, cx - 5, y + 2, 1, 2, C.bodyDark)
    drawPixelRect(ctx, cx + 5, y + 2, 1, 2, C.bodyDark)
  }

  // Legs
  drawPixelRect(ctx, cx - 2, y + 5, 2, 2, C.bodyDark)
  drawPixelRect(ctx, cx + 1, y + 5, 2, 2, C.bodyDark)

  // Chest detail
  drawPixelRect(ctx, cx - 1, y + 1, 3, 1, state === 'working' ? C.star : state === 'celebrating' ? '#34d399' : C.eyeDark)
}

function drawScene(ctx, w, h, frame, state) {
  const cols = Math.floor(w / PIXEL)
  const rows = Math.floor(h / PIXEL)

  // Background
  ctx.fillStyle = '#0c0a09'
  ctx.fillRect(0, 0, w, h)

  // Wall
  drawPixelRect(ctx, 0, 0, cols, rows - 12, C.wall)

  // Floor
  drawPixelRect(ctx, 0, rows - 12, cols, 12, C.floor)

  // Desk
  const deskX = Math.floor(cols / 2) - 15
  const deskY = rows - 18
  drawPixelRect(ctx, deskX, deskY, 30, 2, C.deskTop)
  drawPixelRect(ctx, deskX + 2, deskY + 2, 2, 6, C.desk)
  drawPixelRect(ctx, deskX + 26, deskY + 2, 2, 6, C.desk)

  // Monitor on desk
  const monX = Math.floor(cols / 2) - 6
  const monY = deskY - 8
  drawPixelRect(ctx, monX, monY, 13, 8, '#27272a')
  drawPixelRect(ctx, monX + 1, monY + 1, 11, 6, C.screen)
  
  // Screen content based on state
  if (state === 'working') {
    // Scrolling code lines
    for (let i = 0; i < 4; i++) {
      const lineW = 3 + ((frame + i * 7) % 6)
      drawPixelRect(ctx, monX + 2, monY + 2 + i, lineW, 1, C.screenGlow)
    }
  } else if (state === 'celebrating') {
    // Checkmark
    drawPixelRect(ctx, monX + 3, monY + 4, 1, 1, C.screenGlow)
    drawPixelRect(ctx, monX + 4, monY + 5, 1, 1, C.screenGlow)
    drawPixelRect(ctx, monX + 5, monY + 4, 1, 1, C.screenGlow)
    drawPixelRect(ctx, monX + 6, monY + 3, 1, 1, C.screenGlow)
    drawPixelRect(ctx, monX + 7, monY + 2, 1, 1, C.screenGlow)
  } else {
    // Idle - blinking cursor
    if (frame % 30 < 15) {
      drawPixelRect(ctx, monX + 2, monY + 2, 1, 1, C.screenGlow)
    }
  }

  // Monitor stand
  drawPixelRect(ctx, Math.floor(cols / 2) - 1, deskY - 1, 3, 1, '#27272a')

  // Coffee mug
  const mugX = deskX + 22
  drawPixelRect(ctx, mugX, deskY - 3, 3, 3, '#78716c')
  drawPixelRect(ctx, mugX + 3, deskY - 2, 1, 2, '#78716c')
  // Steam
  if (frame % 20 < 10) {
    drawPixelRect(ctx, mugX + 1, deskY - 4 - (frame % 3), 1, 1, '#a8a29e')
  }

  // Plant
  drawPixelRect(ctx, deskX + 3, deskY - 4, 3, 1, '#34d399')
  drawPixelRect(ctx, deskX + 2, deskY - 3, 2, 1, '#34d399')
  drawPixelRect(ctx, deskX + 5, deskY - 3, 1, 1, '#34d399')
  drawPixelRect(ctx, deskX + 4, deskY - 2, 2, 2, '#78716c')

  // Bot character (sitting at desk)
  const botX = Math.floor(cols / 2)
  const botY = deskY - 3
  drawBot(ctx, botX, botY, frame, state)

  // Confetti for celebrating
  if (state === 'celebrating') {
    for (let i = 0; i < 12; i++) {
      const cx = (i * 17 + frame * 2) % cols
      const cy = (i * 13 + frame) % (rows - 12)
      const color = C.confetti[i % C.confetti.length]
      drawPixelRect(ctx, cx, cy, 1, 1, color)
    }
  }

  // Floating Z's for idle
  if (state === 'idle') {
    const zAlpha = Math.sin(frame * 0.05)
    if (zAlpha > 0) {
      const zx = botX + 6
      const zy = botY - 10 - Math.floor(frame * 0.1) % 5
      ctx.fillStyle = `rgba(163, 163, 163, ${zAlpha * 0.6})`
      ctx.fillRect(zx * PIXEL, zy * PIXEL, PIXEL * 2, PIXEL - 1)
      ctx.fillRect((zx + 1) * PIXEL, (zy + 1) * PIXEL, PIXEL, PIXEL - 1)
      ctx.fillRect(zx * PIXEL, (zy + 2) * PIXEL, PIXEL * 2, PIXEL - 1)
    }
  }
}

function deriveState(tasks, celebratingRef) {
  const inProgress = tasks.filter(t => t.status === 'in-progress')
  const done = tasks.filter(t => t.status === 'done')

  // Check for newly completed tasks by tracking seen done-task IDs
  const doneIds = new Set(done.map(t => t.id || t._id))
  const prevDoneIds = celebratingRef.current.seenDoneIds
  const hasNewDone = [...doneIds].some(id => !prevDoneIds.has(id))

  if (hasNewDone) {
    celebratingRef.current.seenDoneIds = doneIds
    celebratingRef.current.celebrateUntil = Date.now() + 30000
  } else {
    // Update seen set without triggering celebration
    celebratingRef.current.seenDoneIds = doneIds
  }

  if (Date.now() < celebratingRef.current.celebrateUntil) return 'celebrating'
  if (inProgress.length > 0) return 'working'
  return 'idle'
}

const STATE_LABELS = {
  idle: { text: '💤 Idle — Waiting for tasks...', color: 'text-zinc-400' },
  working: { text: '⚡ Working — Processing tasks!', color: 'text-amber-400' },
  celebrating: { text: '🎉 Done — Task completed!', color: 'text-green-400' },
}

export default function PixelBotView() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const animRef = useRef(null)
  const celebratingRef = useRef({ seenDoneIds: new Set(), celebrateUntil: 0 })
  const [tasks, setTasks] = useState([])
  const [botState, setBotState] = useState('idle')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data)
    } catch {}
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useSocket('tasks', (newTasks) => { setTasks(newTasks) })

  useEffect(() => {
    setBotState(deriveState(tasks, celebratingRef))
  }, [tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let paused = document.hidden

    const animate = () => {
      if (paused) return
      frameRef.current = (frameRef.current + 1) % 10000
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawScene(ctx, w, h, frameRef.current, botState)
      animRef.current = requestAnimationFrame(animate)
    }

    const onVisibility = () => {
      paused = document.hidden
      if (!paused && !animRef.current) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    animRef.current = requestAnimationFrame(animate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [botState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const label = STATE_LABELS[botState]
  const counts = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
        <div className="flex gap-4 text-xs text-zinc-500">
          <span>📋 {counts.backlog} backlog</span>
          <span>📌 {counts.todo} todo</span>
          <span className="text-amber-500">⚡ {counts['in-progress']} active</span>
          <span className="text-green-500">✅ {counts.done} done</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-lg overflow-hidden border border-zinc-800 bg-[#0c0a09] relative" style={{ imageRendering: 'pixelated' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  )
}
