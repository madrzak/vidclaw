import { PIXEL } from './constants'
import { drawPixelRect } from './drawing'
import { drawLobster } from './lobster'
import { drawTaskPile, drawCouch, drawDesk, drawBookshelf, drawAquarium, drawPlant, drawWallClock, drawPoster } from './furniture'
import { drawSpaceWindow } from './space'
import { computeLayout, computeWaypoints, updateLobster } from './lobsterAI'

export function drawScene(ctx, w, h, frame, botState, counts, lobster) {
  const cols = Math.floor(w / PIXEL)
  const rows = Math.floor(h / PIXEL)
  const layout = computeLayout(cols, rows)
  const { floorY, midX, deskX, deskY, shelfX, pileLeftX, pileRightX, aquariumX, couchX, plantX } = layout

  // Update lobster state machine before drawing
  updateLobster(lobster, botState, layout)

  // === SPACESHIP WINDOW BACKGROUND ===
  drawSpaceWindow(ctx, cols, floorY, frame)

  // Floor (ship deck plating)
  drawPixelRect(ctx, 0, floorY, cols, 12, '#1c1917')
  for (let x = 0; x < cols; x += 8) {
    drawPixelRect(ctx, x, floorY, 1, 12, '#27272a')
  }
  drawPixelRect(ctx, 0, floorY, cols, 1, '#3f3f46')

  // === FAR LEFT: Bookshelf ===
  drawBookshelf(ctx, shelfX, floorY)

  // === LEFT: Todo task pile ===
  const todoCount = (counts.backlog || 0) + (counts.todo || 0)
  drawTaskPile(ctx, pileLeftX, floorY, todoCount, '#eab308')

  // === RIGHT OF DESK: Done task pile ===
  const doneCount = counts.done || 0
  drawTaskPile(ctx, pileRightX, floorY, doneCount, '#22c55e')

  // === AQUARIUM: between done pile and couch ===
  drawAquarium(ctx, aquariumX, floorY, frame)

  // === FAR RIGHT: Chill area (couch) ===
  drawCouch(ctx, couchX, floorY)

  // === Plant next to couch ===
  drawPlant(ctx, plantX, floorY, frame)

  // === Wall decorations ===
  drawWallClock(ctx, couchX, floorY - 25, frame)
  drawPoster(ctx, shelfX + 16, floorY - 26, 0)
  drawPoster(ctx, midX + 14, floorY - 28, 1)

  // === DESK: determine screen state from lobster phase ===
  const waypoints = computeWaypoints(layout)
  const lobsterAtDesk = lobster.phase === 'working' ||
    (lobster.phase === 'roaming' && lobster.roamSubPhase === 'paused' && waypoints[lobster.waypointIndex]?.atDesk)
  const deskState = lobster.phase === 'working' ? 'working' : 'idle'
  drawDesk(ctx, deskX, deskY, midX, deskState, frame, lobsterAtDesk)

  // === LOBSTER: draw at state machine position ===
  const lobX = Math.round(lobster.x)
  const lobY = Math.round(lobster.y)
  let drawState
  if (lobster.phase === 'working') drawState = 'working'
  else if (lobster.phase === 'celebrating') drawState = 'celebrating'
  else if (lobster.walking) drawState = 'walking'
  else drawState = 'idle'
  drawLobster(ctx, lobX, lobY, frame, drawState)

  // Bubbles when paused during roaming
  if (lobster.phase === 'roaming' && !lobster.walking) {
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
