import { C } from './constants'
import { drawPixelRect } from './drawing'

export function drawTaskPile(ctx, px, floorY, count, color) {
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

export function drawCouch(ctx, cx, floorY) {
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

export function drawDesk(ctx, deskX, deskY, midX, monX, monY, mugX, state, frame) {
  // Desk surface and legs
  drawPixelRect(ctx, deskX, deskY, 30, 2, C.deskTop)
  drawPixelRect(ctx, deskX + 2, deskY + 2, 2, 6, C.desk)
  drawPixelRect(ctx, deskX + 26, deskY + 2, 2, 6, C.desk)

  // Monitor
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

  // Coffee mug
  drawPixelRect(ctx, mugX, deskY - 3, 3, 3, '#78716c')
  drawPixelRect(ctx, mugX + 3, deskY - 2, 1, 2, '#78716c')
  if (frame % 40 < 20) {
    drawPixelRect(ctx, mugX + 1, deskY - 4 - Math.floor((frame % 30) / 10), 1, 1, '#a8a29e')
  }
}
