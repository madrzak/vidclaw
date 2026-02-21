import { PIXEL } from './constants'
import { drawPixelRect } from './drawing'

function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

export function drawSpaceWindow(ctx, cols, floorY, frame) {
  // Space background
  drawPixelRect(ctx, 0, 0, cols, floorY, '#05050f')

  // Ship hull border
  drawPixelRect(ctx, 0, 0, cols, 2, '#27272a')
  drawPixelRect(ctx, 0, floorY - 2, cols, 2, '#3f3f46')
  drawPixelRect(ctx, 0, floorY - 1, cols, 1, '#52525b')
  // Side hull pillars
  drawPixelRect(ctx, 0, 0, 3, floorY, '#27272a')
  drawPixelRect(ctx, cols - 3, 0, 3, floorY, '#27272a')
  // Rivet details
  for (let i = 4; i < floorY - 4; i += 6) {
    drawPixelRect(ctx, 1, i, 1, 1, '#3f3f46')
    drawPixelRect(ctx, cols - 2, i, 1, 1, '#3f3f46')
  }

  // Stars
  const rng = seededRandom(42)
  const starCount = Math.floor(cols * (floorY - 4) / 80)
  for (let i = 0; i < starCount; i++) {
    const sx = 4 + Math.floor(rng() * (cols - 8))
    const sy = 3 + Math.floor(rng() * (floorY - 7))
    const brightness = rng()
    const twinkle = Math.sin(frame * 0.03 + i * 1.7) * 0.3 + 0.7
    if (brightness * twinkle > 0.3) {
      const alpha = Math.min(1, brightness * twinkle)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fillRect(sx * PIXEL, sy * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }

  // Earth
  const earthRadius = Math.min(12, Math.floor(floorY / 4))
  const earthDrift = Math.sin(frame * 0.003) * 6
  const earthCX = Math.floor(cols * 0.35) + Math.round(earthDrift)
  const earthCY = Math.floor(floorY * 0.4) + Math.round(Math.sin(frame * 0.002) * 2)

  for (let dy = -earthRadius; dy <= earthRadius; dy++) {
    for (let dx = -earthRadius; dx <= earthRadius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > earthRadius) continue
      const px = earthCX + dx
      const py = earthCY + dy
      if (px < 4 || px >= cols - 4 || py < 3 || py >= floorY - 2) continue

      const angle = Math.atan2(dy, dx) + frame * 0.004
      const normalDist = dist / earthRadius
      const landNoise = Math.sin(angle * 3 + 1.5) * Math.cos(angle * 2 - 0.8) +
                         Math.sin(dy * 0.5 + dx * 0.3) * 0.4
      const isLand = landNoise > 0.15 && normalDist < 0.9

      if (normalDist > 0.85) {
        ctx.fillStyle = 'rgba(100, 180, 255, 0.5)'
      } else if (isLand) {
        ctx.fillStyle = normalDist < 0.5 ? '#22c55e' : '#16a34a'
      } else {
        ctx.fillStyle = normalDist < 0.4 ? '#3b82f6' : '#2563eb'
      }
      ctx.fillRect(px * PIXEL, py * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }

  // Atmosphere halo
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const hx = earthCX + Math.round(Math.cos(a) * (earthRadius + 1))
    const hy = earthCY + Math.round(Math.sin(a) * (earthRadius + 1))
    if (hx >= 4 && hx < cols - 4 && hy >= 3 && hy < floorY - 2) {
      ctx.fillStyle = 'rgba(100, 180, 255, 0.2)'
      ctx.fillRect(hx * PIXEL, hy * PIXEL, PIXEL - 1, PIXEL - 1)
    }
  }
}
