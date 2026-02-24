import { PIXEL } from './constants'

export function drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x * PIXEL, y * PIXEL, w * PIXEL - 1, h * PIXEL - 1)
}
