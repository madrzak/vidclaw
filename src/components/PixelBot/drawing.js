import { PIXEL } from './constants'

export function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(x * PIXEL, y * PIXEL, w * PIXEL - 1, h * PIXEL - 1)
}
