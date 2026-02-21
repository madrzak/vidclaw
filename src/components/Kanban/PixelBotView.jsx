import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../../hooks/useSocket.jsx'

// Pixel art lobster colors
const C = {
  shell: '#dc2626',       // red
  shellDark: '#991b1b',   // dark red
  shellLight: '#ef4444',  // lighter red
  belly: '#fca5a5',       // pink-ish underside
  eye: '#1e1e1e',         // dark eye
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

const PIXEL = 6
const FRAME_INTERVAL = 1000 / 30 // 30 fps

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x * PIXEL, y * PIXEL, w * PIXEL - 1, h * PIXEL - 1)
}

// Lobster character (centered around cx, cy)
function drawLobster(ctx, cx, cy, frame, state) {
  const y = cy

  // Antennae (two long feelers)
  const wave1 = Math.sin(frame * 0.08) * 1.5
  const wave2 = Math.sin(frame * 0.08 + 2) * 1.5
  drawPixelRect(ctx, cx - 3, y - 11 + Math.round(wave1), 1, 1, C.antenna)
  drawPixelRect(ctx, cx - 2, y - 10, 1, 2, C.antenna)
  drawPixelRect(ctx, cx + 3, y - 11 + Math.round(wave2), 1, 1, C.antenna)
  drawPixelRect(ctx, cx + 2, y - 10, 1, 2, C.antenna)

  // Eye stalks
  drawPixelRect(ctx, cx - 3, y - 8, 1, 2, C.eyeStalk)
  drawPixelRect(ctx, cx + 3, y - 8, 1, 2, C.eyeStalk)

  // Eyes
  const blink = frame % 80 < 4
  if (!blink) {
    drawPixelRect(ctx, cx - 4, y - 9, 2, 2, '#fefefe')
    drawPixelRect(ctx, cx + 3, y - 9, 2, 2, '#fefefe')
    const lookX = state === 'working' ? Math.round(Math.sin(frame * 0.08)) : 0
    drawPixelRect(ctx, cx - 4 + lookX, y - 9, 1, 1, C.eye)
    drawPixelRect(ctx, cx + 3 + lookX, y - 9, 1, 1, C.eye)
  } else {
    drawPixelRect(ctx, cx - 4, y - 8, 2, 1, '#fefefe')
    drawPixelRect(ctx, cx + 3, y - 8, 2, 1, '#fefefe')
  }

  // Head / carapace
  drawPixelRect(ctx, cx - 3, y - 7, 7, 4, C.shell)
  drawPixelRect(ctx, cx - 4, y - 6, 1, 2, C.shell)
  drawPixelRect(ctx, cx + 4, y - 6, 1, 2, C.shell)
  // Carapace highlight
  drawPixelRect(ctx, cx - 1, y - 7, 3, 1, C.shellLight)

  // Mouth area
  if (state === 'celebrating') {
    drawPixelRect(ctx, cx - 1, y - 4, 3, 1, C.clawInner)
  } else {
    drawPixelRect(ctx, cx, y - 4, 1, 1, C.shellDark)
  }

  // Body segments (thorax + abdomen)
  drawPixelRect(ctx, cx - 3, y - 3, 7, 3, C.shell)
  drawPixelRect(ctx, cx - 2, y, 5, 2, C.shell)
  drawPixelRect(ctx, cx - 1, y + 2, 3, 2, C.shell)
  // Belly underside detail
  drawPixelRect(ctx, cx - 1, y - 2, 3, 1, C.belly)
  drawPixelRect(ctx, cx - 1, y + 1, 3, 1, C.belly)
  // Segment lines
  drawPixelRect(ctx, cx - 2, y, 5, 1, C.shellDark)
  drawPixelRect(ctx, cx - 1, y + 2, 3, 1, C.shellDark)

  // Tail fan
  drawPixelRect(ctx, cx - 2, y + 4, 1, 1, C.shellDark)
  drawPixelRect(ctx, cx - 1, y + 4, 3, 1, C.shell)
  drawPixelRect(ctx, cx + 2, y + 4, 1, 1, C.shellDark)
  drawPixelRect(ctx, cx - 3, y + 5, 2, 1, C.shellLight)
  drawPixelRect(ctx, cx - 1, y + 5, 3, 1, C.shell)
  drawPixelRect(ctx, cx + 2, y + 5, 2, 1, C.shellLight)

  // Small walking legs (4 pairs)
  for (let i = 0; i < 4; i++) {
    const legWiggle = state === 'working' ? Math.sin(frame * 0.2 + i * 1.5) * 0.6 : 0
    const lx = cx - 4 - Math.round(legWiggle)
    const rx = cx + 4 + Math.round(legWiggle)
    const ly = y - 2 + i
    drawPixelRect(ctx, lx, ly, 1, 1, C.shellDark)
    drawPixelRect(ctx, rx, ly, 1, 1, C.shellDark)
  }

  // Claws (the big ones!)
  if (state === 'working') {
    // Typing! Claws reach down to desk and alternate tapping
    const tap = frame % 8 < 4  // alternates every ~4 frames at 30fps
    const leftUp = tap ? 0 : 2
    const rightUp = tap ? 2 : 0

    // Left claw arm — angled down to desk
    drawPixelRect(ctx, cx - 5, y - 4, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx - 6, y - 2, 1, 3, C.shellDark)
    // Left claw pincer — tapping
    drawPixelRect(ctx, cx - 7, y, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx - 9, y + 1 - leftUp, 2, 2, C.claw)
    drawPixelRect(ctx, cx - 10, y + 1 - leftUp, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx - 10, y + 3 - leftUp, 1, 1, C.clawInner)

    // Right claw arm — angled down to desk
    drawPixelRect(ctx, cx + 5, y - 4, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx + 6, y - 2, 1, 3, C.shellDark)
    // Right claw pincer — tapping
    drawPixelRect(ctx, cx + 7, y, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx + 8, y + 1 - rightUp, 2, 2, C.claw)
    drawPixelRect(ctx, cx + 10, y + 1 - rightUp, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx + 10, y + 3 - rightUp, 1, 1, C.clawInner)
  } else if (state === 'celebrating') {
    // Claws raised up and waving
    const waveL = Math.round(Math.sin(frame * 0.2))
    const waveR = Math.round(Math.cos(frame * 0.2))

    // Left claw arm — raised
    drawPixelRect(ctx, cx - 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 6, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 7, y - 9, 1, 2, C.shellDark)
    // Left claw pincer — open wide, waving
    drawPixelRect(ctx, cx - 9, y - 11 + waveL, 2, 2, C.claw)
    drawPixelRect(ctx, cx - 10, y - 11 + waveL, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx - 10, y - 9 + waveL, 1, 1, C.clawInner)

    // Right claw arm — raised
    drawPixelRect(ctx, cx + 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 6, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 7, y - 9, 1, 2, C.shellDark)
    // Right claw pincer — open wide, waving
    drawPixelRect(ctx, cx + 8, y - 11 + waveR, 2, 2, C.claw)
    drawPixelRect(ctx, cx + 10, y - 11 + waveR, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx + 10, y - 9 + waveR, 1, 1, C.clawInner)
  } else {
    // Idle — claws resting at sides, slow pinch open/close
    const pinch = frame % 60 < 30 ? 0 : 1

    drawPixelRect(ctx, cx - 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 6, y - 6, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 7, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 8, y - 7 - pinch, 2, 2, C.claw)
    drawPixelRect(ctx, cx - 9, y - 7 - pinch, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx - 9, y - 5 + pinch, 1, 1, C.clawInner)

    drawPixelRect(ctx, cx + 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 6, y - 6, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 7, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 7, y - 7 - pinch, 2, 2, C.claw)
    drawPixelRect(ctx, cx + 9, y - 7 - pinch, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx + 9, y - 5 + pinch, 1, 1, C.clawInner)
  }

  // Working state: chest indicator glow
  if (state === 'working') {
    drawPixelRect(ctx, cx, y - 2, 1, 1, frame % 10 < 5 ? C.star : C.belly)
  }
}

function drawTaskPile(ctx, px, floorY, count, color) {
  const shown = Math.min(count, 8)
  for (let i = 0; i < shown; i++) {
    const py = floorY - 2 - i * 2
    const offset = i % 2
    drawPixelRect(ctx, px + offset, py, 8, 2, color)
    drawPixelRect(ctx, px + offset + 1, py, 5, 1, '#fafaf9')
  }
  if (count > 8) {
    drawPixelRect(ctx, px + 3, floorY - 2 - shown * 2 - 1, 1, 1, color)
    drawPixelRect(ctx, px + 5, floorY - 2 - shown * 2 - 2, 1, 1, color)
  }
}

function drawCouch(ctx, cx, floorY) {
  const y = floorY + 2 // sit on the floor, not at the edge
  // Couch back
  drawPixelRect(ctx, cx - 8, y - 8, 16, 2, '#7c3aed')
  drawPixelRect(ctx, cx - 9, y - 7, 1, 4, '#7c3aed') // left arm
  drawPixelRect(ctx, cx + 8, y - 7, 1, 4, '#7c3aed') // right arm
  // Seat cushions
  drawPixelRect(ctx, cx - 8, y - 6, 16, 3, '#8b5cf6')
  // Cushion divider
  drawPixelRect(ctx, cx, y - 6, 1, 2, '#7c3aed')
  // Seat highlights
  drawPixelRect(ctx, cx - 6, y - 6, 5, 1, '#a78bfa')
  drawPixelRect(ctx, cx + 2, y - 6, 5, 1, '#a78bfa')
  // Legs
  drawPixelRect(ctx, cx - 7, y - 3, 1, 3, '#44403c')
  drawPixelRect(ctx, cx + 7, y - 3, 1, 3, '#44403c')
}

// Seeded random for deterministic star positions
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function drawSpaceWindow(ctx, cols, floorY, frame) {
  // Space background (deep blue-black)
  drawPixelRect(ctx, 0, 0, cols, floorY, '#05050f')

  // Ship hull border (top + bottom frame of window)
  drawPixelRect(ctx, 0, 0, cols, 2, '#27272a')
  drawPixelRect(ctx, 0, floorY - 2, cols, 2, '#3f3f46')
  drawPixelRect(ctx, 0, floorY - 1, cols, 1, '#52525b')
  // Side hull pillars
  drawPixelRect(ctx, 0, 0, 3, floorY, '#27272a')
  drawPixelRect(ctx, cols - 3, 0, 3, floorY, '#27272a')
  // Rivet details on pillars
  for (let i = 4; i < floorY - 4; i += 6) {
    drawPixelRect(ctx, 1, i, 1, 1, '#3f3f46')
    drawPixelRect(ctx, cols - 2, i, 1, 1, '#3f3f46')
  }

  // Stars (deterministic with seeded random, twinkle with frame)
  const rng = seededRandom(42)
  const starCount = Math.floor(cols * (floorY - 4) / 80)
  for (let i = 0; i < starCount; i++) {
    const sx = 4 + Math.floor(rng() * (cols - 8))
    const sy = 3 + Math.floor(rng() * (floorY - 7))
    const brightness = rng()
    // Twinkle: each star fades in/out at its own phase
    const twinkle = Math.sin(frame * 0.03 + i * 1.7) * 0.3 + 0.7
    if (brightness * twinkle > 0.3) {
      const alpha = Math.min(1, brightness * twinkle)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fillRect(sx * PIXEL, sy * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }

  // Earth — slowly drifting across the window
  const earthRadius = Math.min(12, Math.floor(floorY / 4))
  const earthDrift = Math.sin(frame * 0.003) * 6 // slow lateral drift
  const earthCX = Math.floor(cols * 0.35) + Math.round(earthDrift)
  const earthCY = Math.floor(floorY * 0.4) + Math.round(Math.sin(frame * 0.002) * 2)

  // Draw Earth as a circle with land/ocean
  for (let dy = -earthRadius; dy <= earthRadius; dy++) {
    for (let dx = -earthRadius; dx <= earthRadius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > earthRadius) continue
      const px = earthCX + dx
      const py = earthCY + dy
      if (px < 4 || px >= cols - 4 || py < 3 || py >= floorY - 2) continue

      // Continent pattern using noise-like math + slow rotation
      const angle = Math.atan2(dy, dx) + frame * 0.004
      const normalDist = dist / earthRadius
      const landNoise = Math.sin(angle * 3 + 1.5) * Math.cos(angle * 2 - 0.8) +
                         Math.sin(dy * 0.5 + dx * 0.3) * 0.4
      const isLand = landNoise > 0.15 && normalDist < 0.9

      // Atmosphere glow on edge
      if (normalDist > 0.85) {
        ctx.fillStyle = 'rgba(100, 180, 255, 0.5)'
      } else if (isLand) {
        // Greens and browns for land
        const shade = normalDist < 0.5 ? '#22c55e' : '#16a34a'
        ctx.fillStyle = shade
      } else {
        // Ocean blues
        const shade = normalDist < 0.4 ? '#3b82f6' : '#2563eb'
        ctx.fillStyle = shade
      }
      ctx.fillRect(px * PIXEL, py * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }

  // Atmosphere halo (a few bright pixels around the edge)
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const hx = earthCX + Math.round(Math.cos(a) * (earthRadius + 1))
    const hy = earthCY + Math.round(Math.sin(a) * (earthRadius + 1))
    if (hx >= 4 && hx < cols - 4 && hy >= 3 && hy < floorY - 2) {
      ctx.fillStyle = 'rgba(100, 180, 255, 0.2)'
      ctx.fillRect(hx * PIXEL, hy * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }
}

function drawScene(ctx, w, h, frame, state, counts) {
  const cols = Math.floor(w / PIXEL)
  const rows = Math.floor(h / PIXEL)
  const floorY = rows - 12
  const midX = Math.floor(cols / 2)

  // === SPACESHIP WINDOW BACKGROUND ===
  drawSpaceWindow(ctx, cols, floorY, frame)

  // Floor (ship deck plating)
  drawPixelRect(ctx, 0, floorY, cols, 12, '#1c1917')
  // Floor detail lines
  for (let x = 0; x < cols; x += 8) {
    drawPixelRect(ctx, x, floorY, 1, 12, '#27272a')
  }
  drawPixelRect(ctx, 0, floorY, cols, 1, '#3f3f46') // floor edge highlight

  // === LEFT: Todo task pile ===
  const todoCount = (counts.backlog || 0) + (counts.todo || 0)
  const pileLeftX = midX - 30
  drawTaskPile(ctx, pileLeftX, floorY, todoCount, '#eab308')

  // === CENTER: Desk (work area) ===
  const deskX = midX - 15
  const deskY = rows - 18
  drawPixelRect(ctx, deskX, deskY, 30, 2, C.deskTop)
  drawPixelRect(ctx, deskX + 2, deskY + 2, 2, 6, C.desk)
  drawPixelRect(ctx, deskX + 26, deskY + 2, 2, 6, C.desk)

  // Monitor on desk
  const monX = midX - 6
  const monY = deskY - 8
  drawPixelRect(ctx, monX, monY, 13, 8, '#27272a')
  drawPixelRect(ctx, monX + 1, monY + 1, 11, 6, C.screen)

  // Screen content
  if (state === 'working') {
    for (let i = 0; i < 4; i++) {
      const lineW = 3 + ((frame + i * 7) % 6)
      drawPixelRect(ctx, monX + 2, monY + 2 + i, lineW, 1, C.screenGlow)
    }
  } else {
    if (frame % 60 < 30) {
      drawPixelRect(ctx, monX + 5, monY + 4, 2, 1, '#27272a')
    }
  }

  // Monitor stand
  drawPixelRect(ctx, midX - 1, deskY - 1, 3, 1, '#27272a')

  // Coffee mug on desk
  const mugX = deskX + 22
  drawPixelRect(ctx, mugX, deskY - 3, 3, 3, '#78716c')
  drawPixelRect(ctx, mugX + 3, deskY - 2, 1, 2, '#78716c')
  if (state === 'working' && frame % 20 < 10) {
    drawPixelRect(ctx, mugX + 1, deskY - 4 - (frame % 3), 1, 1, '#a8a29e')
  }

  // === RIGHT OF DESK: Done task pile ===
  const doneCount = counts.done || 0
  const pileRightX = midX + 22
  drawTaskPile(ctx, pileRightX, floorY, doneCount, '#22c55e')

  // === FAR RIGHT: Chill area (couch) ===
  const couchX = midX + 70
  drawCouch(ctx, couchX, floorY)

  // === LOBSTER: position depends on state ===
  if (state === 'working') {
    // At the desk, typing
    const lobX = midX
    const lobY = deskY - 3
    drawLobster(ctx, lobX, lobY, frame, state)
  } else if (state === 'celebrating') {
    // Near the done pile, celebrating
    const lobX = pileRightX + 4
    const lobY = floorY - 5
    drawLobster(ctx, lobX, lobY, frame, state)

  } else {
    // Idle — roaming between waypoints
    const groundY = floorY - 5
    const waypoints = [
      { x: couchX, y: groundY, seatY: floorY - 12, pause: 90 }, // sit on couch
      { x: pileLeftX + 4, y: groundY, pause: 50 },   // check todo pile
      { x: midX + 10, y: groundY, pause: 30 },        // stroll past desk
      { x: pileRightX + 4, y: groundY, pause: 40 },   // check done pile
      { x: midX - 18, y: groundY, pause: 60 },         // gaze out window
    ]
    const walkSpeed = 0.15 // pixels per frame
    // Compute total cycle length (walk segments + pauses)
    let totalCycle = 0
    const segments = []
    for (let i = 0; i < waypoints.length; i++) {
      const next = waypoints[(i + 1) % waypoints.length]
      const dist = Math.abs(next.x - waypoints[i].x) + Math.abs(next.y - waypoints[i].y)
      const walkFrames = Math.ceil(dist / walkSpeed)
      segments.push({ from: waypoints[i], to: next, walkFrames, pauseFrames: waypoints[i].pause })
      totalCycle += walkFrames + waypoints[i].pause
    }

    const cycleFrame = frame % totalCycle
    let elapsed = 0
    let lobX = waypoints[0].x
    let lobY = waypoints[0].y
    let walking = false
    for (const seg of segments) {
      if (cycleFrame < elapsed + seg.pauseFrames) {
        // Pausing at this waypoint — use seatY if available (couch)
        lobX = seg.from.x
        lobY = seg.from.seatY || seg.from.y
        walking = false
        break
      }
      elapsed += seg.pauseFrames
      if (cycleFrame < elapsed + seg.walkFrames) {
        // Walking to next waypoint
        const t = (cycleFrame - elapsed) / seg.walkFrames
        lobX = Math.round(seg.from.x + (seg.to.x - seg.from.x) * t)
        lobY = Math.round(seg.from.y + (seg.to.y - seg.from.y) * t)
        walking = true
        break
      }
      elapsed += seg.walkFrames
    }

    drawLobster(ctx, lobX, lobY, frame, walking ? 'working' : state)

    // Bubbles when paused
    if (!walking) {
      for (let i = 0; i < 3; i++) {
        const phase = frame * 0.04 + i * 2.1
        const alpha = Math.sin(phase) * 0.5 + 0.3
        if (alpha > 0.15) {
          const bx = lobX + 5 + i
          const by = lobY - 10 - Math.floor((frame * 0.08 + i * 5) % 8)
          if (by >= 3) {
            ctx.fillStyle = `rgba(125, 211, 252, ${alpha})`
            ctx.fillRect(bx * PIXEL, by * PIXEL, PIXEL - 1, PIXEL - 1)
          }
        }
      }
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

export default function PixelBotView({ onAddTask }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const animRef = useRef(null)
  const lastFrameTime = useRef(0)
  const celebratingRef = useRef({ seenDoneIds: new Set(), celebrateUntil: 0 })
  const countsRef = useRef({ backlog: 0, todo: 0, 'in-progress': 0, done: 0 })
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
    countsRef.current = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    }
  }, [tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let paused = document.hidden

    const animate = (timestamp) => {
      if (paused) return
      animRef.current = requestAnimationFrame(animate)
      const elapsed = timestamp - lastFrameTime.current
      if (elapsed < FRAME_INTERVAL) return
      lastFrameTime.current = timestamp - (elapsed % FRAME_INTERVAL)
      frameRef.current = (frameRef.current + 1) % 10000
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawScene(ctx, w, h, frameRef.current, botState, countsRef.current)
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
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>📋 {counts.backlog} backlog</span>
          <span>📌 {counts.todo} todo</span>
          <span className="text-amber-500">⚡ {counts['in-progress']} active</span>
          <span className="text-green-500">✅ {counts.done} done</span>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="ml-2 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-lg overflow-hidden border border-zinc-800 bg-[#0c0a09] relative" style={{ imageRendering: 'pixelated' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  )
}
