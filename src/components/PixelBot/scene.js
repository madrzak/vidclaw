import { PIXEL } from './constants'
import { drawPixelRect } from './drawing'
import { drawLobster } from './lobster'
import { drawTaskPile, drawCouch, drawDesk } from './furniture'
import { drawSpaceWindow } from './space'

export function drawScene(ctx, w, h, frame, state, counts) {
  const cols = Math.floor(w / PIXEL)
  const rows = Math.floor(h / PIXEL)
  const floorY = rows - 12
  const midX = Math.floor(cols / 2)

  // === SPACESHIP WINDOW BACKGROUND ===
  drawSpaceWindow(ctx, cols, floorY, frame)

  // Floor (ship deck plating)
  drawPixelRect(ctx, 0, floorY, cols, 12, '#1c1917')
  for (let x = 0; x < cols; x += 8) {
    drawPixelRect(ctx, x, floorY, 1, 12, '#27272a')
  }
  drawPixelRect(ctx, 0, floorY, cols, 1, '#3f3f46')

  // === LEFT: Todo task pile ===
  const todoCount = (counts.backlog || 0) + (counts.todo || 0)
  const pileLeftX = midX - 30
  drawTaskPile(ctx, pileLeftX, floorY, todoCount, '#eab308')

  // === CENTER: Desk (work area) ===
  const deskX = midX - 15
  const deskY = rows - 18
  const monX = midX - 6
  const monY = deskY - 8
  const mugX = deskX + 22
  drawDesk(ctx, deskX, deskY, midX, monX, monY, mugX, state, frame)

  // === RIGHT OF DESK: Done task pile ===
  const doneCount = counts.done || 0
  const pileRightX = midX + 22
  drawTaskPile(ctx, pileRightX, floorY, doneCount, '#22c55e')

  // === FAR RIGHT: Chill area (couch) ===
  const couchX = midX + 70
  drawCouch(ctx, couchX, floorY)

  // === LOBSTER: position depends on state ===
  if (state === 'working') {
    const lobX = midX
    const lobY = deskY - 3
    drawLobster(ctx, lobX, lobY, frame, state)
  } else if (state === 'celebrating') {
    const lobX = pileRightX + 4
    const lobY = floorY - 5
    drawLobster(ctx, lobX, lobY, frame, state)
  } else {
    // Idle — roaming between waypoints
    const groundY = floorY - 5
    const waypoints = [
      { x: couchX, y: groundY, seatY: floorY - 12, pause: 60 },
      { x: pileLeftX + 4, y: groundY, pause: 30 },
      { x: midX + 10, y: groundY, pause: 20 },
      { x: pileRightX + 4, y: groundY, pause: 30 },
      { x: midX - 18, y: groundY, pause: 40 },
    ]
    const walkSpeed = 0.3
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
        lobX = seg.from.x
        lobY = seg.from.seatY || seg.from.y
        walking = false
        break
      }
      elapsed += seg.pauseFrames
      if (cycleFrame < elapsed + seg.walkFrames) {
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
