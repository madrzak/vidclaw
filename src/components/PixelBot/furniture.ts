import { C, PIXEL } from './constants'
import { drawPixelRect } from './drawing'

export function drawTaskPile(ctx: CanvasRenderingContext2D, px: number, floorY: number, count: number, color: string): void {
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

export function drawCouch(ctx: CanvasRenderingContext2D, cx: number, floorY: number): void {
  const y = floorY + 2
  drawPixelRect(ctx, cx - 8, y - 8, 16, 2, '#7c3aed')
  drawPixelRect(ctx, cx - 9, y - 7, 1, 4, '#7c3aed')
  drawPixelRect(ctx, cx + 8, y - 7, 1, 4, '#7c3aed')
  drawPixelRect(ctx, cx - 8, y - 6, 16, 3, '#8b5cf6')
  drawPixelRect(ctx, cx, y - 6, 1, 2, '#7c3aed')
  drawPixelRect(ctx, cx - 6, y - 6, 5, 1, '#a78bfa')
  drawPixelRect(ctx, cx + 2, y - 6, 5, 1, '#a78bfa')
  drawPixelRect(ctx, cx - 7, y - 3, 1, 3, '#44403c')
  drawPixelRect(ctx, cx + 7, y - 3, 1, 3, '#44403c')
}

export function drawDesk(ctx: CanvasRenderingContext2D, deskX: number, deskY: number, midX: number, state: string, frame: number, lobsterAtDesk: boolean): void {
  // Desk surface and legs
  drawPixelRect(ctx, deskX, deskY, 30, 2, C.deskTop)
  drawPixelRect(ctx, deskX + 2, deskY + 2, 2, 6, C.desk)
  drawPixelRect(ctx, deskX + 26, deskY + 2, 2, 6, C.desk)

  // Monitor (bigger: 17x11)
  const monX = midX - 8
  const monY = deskY - 11
  drawPixelRect(ctx, monX, monY, 17, 11, '#27272a')
  drawPixelRect(ctx, monX + 1, monY + 1, 15, 9, C.screen)

  // Screen content
  if (state === 'working') {
    // Code scrolling
    for (let i = 0; i < 6; i++) {
      const lineW = 3 + ((frame + i * 7) % 8)
      drawPixelRect(ctx, monX + 2, monY + 2 + i, lineW, 1, C.screenGlow)
    }
  } else if (lobsterAtDesk) {
    // Browsing X/Twitter feed when lobster is at the desk
    const scrollOffset = Math.floor(frame * 0.05) % 20

    // X logo in top-left of screen
    drawPixelRect(ctx, monX + 2, monY + 2, 1, 1, '#a1a1aa')
    drawPixelRect(ctx, monX + 4, monY + 2, 1, 1, '#a1a1aa')
    drawPixelRect(ctx, monX + 3, monY + 3, 1, 1, '#a1a1aa')
    drawPixelRect(ctx, monX + 2, monY + 4, 1, 1, '#a1a1aa')
    drawPixelRect(ctx, monX + 4, monY + 4, 1, 1, '#a1a1aa')

    // Scrolling "posts"
    for (let i = 0; i < 4; i++) {
      const postY = monY + 3 + ((i * 3 + scrollOffset) % 12)
      if (postY >= monY + 2 && postY <= monY + 8) {
        drawPixelRect(ctx, monX + 2, postY, 1, 1, '#71717a')
        const postW = 4 + ((i * 3) % 5)
        drawPixelRect(ctx, monX + 4, postY, postW, 1, '#52525b')
      }
    }
  } else {
    // Screen off — standby dot
    if (frame % 60 < 30) {
      drawPixelRect(ctx, monX + 8, monY + 5, 1, 1, '#27272a')
    }
  }

  // Monitor stand
  drawPixelRect(ctx, midX - 2, deskY - 1, 5, 1, '#27272a')
  const mugX = deskX + 22

  // Coffee mug
  drawPixelRect(ctx, mugX, deskY - 3, 3, 3, '#78716c')
  drawPixelRect(ctx, mugX + 3, deskY - 2, 1, 2, '#78716c')
  if (frame % 40 < 20) {
    drawPixelRect(ctx, mugX + 1, deskY - 4 - Math.floor((frame % 30) / 10), 1, 1, '#a8a29e')
  }
}

export function drawBookshelf(ctx: CanvasRenderingContext2D, bx: number, floorY: number): void {
  const y = floorY
  const w = 14
  const h = 20

  // Back panel
  drawPixelRect(ctx, bx, y - h, w, h, '#44403c')
  // Side edges
  drawPixelRect(ctx, bx, y - h, 1, h, '#292524')
  drawPixelRect(ctx, bx + w - 1, y - h, 1, h, '#292524')
  // Top
  drawPixelRect(ctx, bx, y - h, w, 1, '#292524')

  // 3 shelves
  const shelfYs = [y - 1, y - 7, y - 13]
  for (const sy of shelfYs) {
    drawPixelRect(ctx, bx, sy, w, 1, '#78716c')
  }

  // Books on each shelf (different colors and widths)
  const bookColors = [
    ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'],
    ['#0891b2', '#e11d48', '#ca8a04', '#7c3aed'],
    ['#059669', '#db2777', '#2563eb', '#f59e0b', '#6366f1'],
  ]

  for (let s = 0; s < 3; s++) {
    const sy = shelfYs[s]
    let cx = bx + 1
    const colors = bookColors[s]
    for (let b = 0; b < colors.length; b++) {
      const bw = 2 + (b % 2)
      const bh = 4 + (b % 3)
      if (cx + bw > bx + w - 1) break
      drawPixelRect(ctx, cx, sy - bh, bw, bh, colors[b])
      // Spine highlight
      drawPixelRect(ctx, cx + 1, sy - bh + 1, 1, bh - 2, 'rgba(255,255,255,0.15)')
      cx += bw + 1
    }
  }
}

export function drawAquarium(ctx: CanvasRenderingContext2D, ax: number, floorY: number, frame: number): void {
  const standH = 6
  const tankW = 14
  const tankH = 10
  const tankY = floorY - standH - tankH

  // Stand legs
  drawPixelRect(ctx, ax + 1, floorY - standH, 2, standH, '#78716c')
  drawPixelRect(ctx, ax + tankW - 3, floorY - standH, 2, standH, '#78716c')
  // Stand top
  drawPixelRect(ctx, ax, floorY - standH, tankW, 1, '#a8a29e')

  // Tank glass frame
  drawPixelRect(ctx, ax, tankY, tankW, tankH, '#94a3b8')
  // Water
  drawPixelRect(ctx, ax + 1, tankY + 1, tankW - 2, tankH - 2, '#0c4a6e')

  // Gravel at bottom
  for (let g = 0; g < tankW - 2; g++) {
    const gc = g % 3 === 0 ? '#a8a29e' : g % 3 === 1 ? '#78716c' : '#d6d3d1'
    drawPixelRect(ctx, ax + 1 + g, tankY + tankH - 2, 1, 1, gc)
  }

  // Seaweed (2 stalks with sway)
  for (let s = 0; s < 2; s++) {
    const sx = ax + 3 + s * 7
    const sway = Math.sin(frame * 0.03 + s * 2) * 0.5
    for (let sy = 0; sy < 4; sy++) {
      const swayOff = sy > 1 ? Math.round(sway) : 0
      drawPixelRect(ctx, sx + swayOff, tankY + tankH - 3 - sy, 1, 1, '#22c55e')
    }
  }

  // Fish (3 tiny fish swimming back and forth)
  const fishColors = ['#f97316', '#facc15', '#f43f5e']
  for (let f = 0; f < 3; f++) {
    const swimRange = tankW - 5
    const speed = 0.02 + f * 0.008
    const phase = frame * speed + f * 30
    const t = (Math.sin(phase) + 1) / 2
    const fx = ax + 2 + Math.floor(t * swimRange)
    const fy = tankY + 2 + f * 2
    const goingRight = Math.cos(phase) > 0

    // Fish body (2px)
    drawPixelRect(ctx, fx, fy, 2, 1, fishColors[f])
    // Tail (1px behind)
    const tailX = goingRight ? fx - 1 : fx + 2
    drawPixelRect(ctx, tailX, fy, 1, 1, fishColors[f])
  }

  // Light reflection on glass
  drawPixelRect(ctx, ax + 1, tankY + 1, 1, 2, 'rgba(255,255,255,0.2)')
}

export function drawPlant(ctx: CanvasRenderingContext2D, px: number, floorY: number, frame: number): void {
  // Pot
  drawPixelRect(ctx, px, floorY - 4, 6, 4, '#b45309')
  drawPixelRect(ctx, px + 1, floorY - 4, 4, 1, '#d97706')
  // Pot rim
  drawPixelRect(ctx, px - 1, floorY - 4, 8, 1, '#92400e')
  // Soil
  drawPixelRect(ctx, px + 1, floorY - 4, 4, 1, '#44403c')

  // Stem
  drawPixelRect(ctx, px + 3, floorY - 8, 1, 4, '#15803d')

  // Leaves (3 pairs, swaying slightly)
  const leafPositions = [
    { y: floorY - 8, dir: -1 },
    { y: floorY - 10, dir: 1 },
    { y: floorY - 12, dir: -1 },
  ]
  for (let i = 0; i < leafPositions.length; i++) {
    const lp = leafPositions[i]
    const leafSway = Math.round(Math.sin(frame * 0.015 + i * 1.5) * 0.5)
    const lx = px + 3 + lp.dir * 2 + leafSway
    drawPixelRect(ctx, lx, lp.y, 2, 1, '#22c55e')
    drawPixelRect(ctx, lx + lp.dir, lp.y - 1, 2, 1, '#16a34a')
    // Stem segment up to this leaf
    if (i > 0) {
      drawPixelRect(ctx, px + 3, lp.y, 1, 2, '#15803d')
    }
  }

  // Top leaf cluster
  drawPixelRect(ctx, px + 2, floorY - 14, 3, 1, '#22c55e')
  drawPixelRect(ctx, px + 1, floorY - 13, 2, 1, '#16a34a')
  drawPixelRect(ctx, px + 4, floorY - 13, 2, 1, '#16a34a')
}

export function drawWallClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number): void {
  // Clock face (5x5)
  drawPixelRect(ctx, cx - 2, cy - 2, 5, 5, '#d4d4d8')
  // Frame
  drawPixelRect(ctx, cx - 3, cy - 2, 1, 5, '#71717a')
  drawPixelRect(ctx, cx + 3, cy - 2, 1, 5, '#71717a')
  drawPixelRect(ctx, cx - 2, cy - 3, 5, 1, '#71717a')
  drawPixelRect(ctx, cx - 2, cy + 3, 5, 1, '#71717a')

  // Hour markers
  drawPixelRect(ctx, cx, cy - 2, 1, 1, '#27272a')  // 12
  drawPixelRect(ctx, cx, cy + 2, 1, 1, '#27272a')  // 6
  drawPixelRect(ctx, cx - 2, cy, 1, 1, '#27272a')  // 9
  drawPixelRect(ctx, cx + 2, cy, 1, 1, '#27272a')  // 3

  // Center dot
  drawPixelRect(ctx, cx, cy, 1, 1, '#27272a')

  // Hour hand (slow rotation)
  const hourAngle = (frame * 0.001) % 4
  const hx = Math.round(Math.sin(hourAngle * Math.PI / 2))
  const hy = -Math.round(Math.cos(hourAngle * Math.PI / 2))
  drawPixelRect(ctx, cx + hx, cy + hy, 1, 1, '#27272a')

  // Minute hand (faster rotation)
  const minAngle = (frame * 0.01) % 4
  const mx = Math.round(Math.sin(minAngle * Math.PI / 2) * 1.5)
  const my = -Math.round(Math.cos(minAngle * Math.PI / 2) * 1.5)
  drawPixelRect(ctx, cx + mx, cy + my, 1, 1, '#dc2626')
}

export function drawPoster(ctx: CanvasRenderingContext2D, px: number, py: number, variant: number = 0): void {
  // Frame
  drawPixelRect(ctx, px, py, 8, 10, '#44403c')
  // Inner mat
  drawPixelRect(ctx, px + 1, py + 1, 6, 8, '#1c1917')

  if (variant === 0) {
    // Space poster — planet with rings
    drawPixelRect(ctx, px + 3, py + 4, 2, 2, '#7c3aed')
    drawPixelRect(ctx, px + 2, py + 5, 4, 1, '#a78bfa')
    // Stars
    drawPixelRect(ctx, px + 2, py + 2, 1, 1, '#fbbf24')
    drawPixelRect(ctx, px + 5, py + 3, 1, 1, '#fbbf24')
    drawPixelRect(ctx, px + 6, py + 7, 1, 1, '#fbbf24')
  } else {
    // Lobster motivational poster
    drawPixelRect(ctx, px + 3, py + 3, 2, 2, '#dc2626')
    drawPixelRect(ctx, px + 2, py + 3, 1, 1, '#f87171')
    drawPixelRect(ctx, px + 5, py + 3, 1, 1, '#f87171')
    // "text" lines below
    drawPixelRect(ctx, px + 2, py + 6, 4, 1, '#52525b')
    drawPixelRect(ctx, px + 3, py + 7, 2, 1, '#52525b')
  }
}
