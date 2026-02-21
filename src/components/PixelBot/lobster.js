import { C } from './constants'
import { drawPixelRect } from './drawing'

export function drawLobster(ctx, cx, cy, frame, state) {
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
  drawPixelRect(ctx, cx - 1, y - 2, 3, 1, C.belly)
  drawPixelRect(ctx, cx - 1, y + 1, 3, 1, C.belly)
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
    const legWiggle = (state === 'working' || state === 'walking') ? Math.sin(frame * 0.2 + i * 1.5) * 0.6 : 0
    const lx = cx - 4 - Math.round(legWiggle)
    const rx = cx + 4 + Math.round(legWiggle)
    const ly = y - 2 + i
    drawPixelRect(ctx, lx, ly, 1, 1, C.shellDark)
    drawPixelRect(ctx, rx, ly, 1, 1, C.shellDark)
  }

  // Claws
  if (state === 'working') {
    const tap = frame % 8 < 4
    const leftUp = tap ? 0 : 2
    const rightUp = tap ? 2 : 0

    drawPixelRect(ctx, cx - 5, y - 4, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx - 6, y - 2, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx - 7, y, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx - 9, y + 1 - leftUp, 2, 2, C.claw)
    drawPixelRect(ctx, cx - 10, y + 1 - leftUp, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx - 10, y + 3 - leftUp, 1, 1, C.clawInner)

    drawPixelRect(ctx, cx + 5, y - 4, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx + 6, y - 2, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx + 7, y, 1, 3, C.shellDark)
    drawPixelRect(ctx, cx + 8, y + 1 - rightUp, 2, 2, C.claw)
    drawPixelRect(ctx, cx + 10, y + 1 - rightUp, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx + 10, y + 3 - rightUp, 1, 1, C.clawInner)
  } else if (state === 'celebrating') {
    const waveL = Math.round(Math.sin(frame * 0.2))
    const waveR = Math.round(Math.cos(frame * 0.2))

    drawPixelRect(ctx, cx - 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 6, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 7, y - 9, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx - 9, y - 11 + waveL, 2, 2, C.claw)
    drawPixelRect(ctx, cx - 10, y - 11 + waveL, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx - 10, y - 9 + waveL, 1, 1, C.clawInner)

    drawPixelRect(ctx, cx + 5, y - 5, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 6, y - 7, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 7, y - 9, 1, 2, C.shellDark)
    drawPixelRect(ctx, cx + 8, y - 11 + waveR, 2, 2, C.claw)
    drawPixelRect(ctx, cx + 10, y - 11 + waveR, 1, 1, C.clawInner)
    drawPixelRect(ctx, cx + 10, y - 9 + waveR, 1, 1, C.clawInner)
  } else {
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
