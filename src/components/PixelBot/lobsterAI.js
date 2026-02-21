import { WALK_SPEED } from './constants'

export function computeLayout(cols, rows) {
  const floorY = rows - 12
  const midX = Math.floor(cols / 2)
  const groundY = floorY - 5
  const deskX = midX - 15
  const deskY = rows - 18
  const shelfX = midX - 55
  const pileLeftX = midX - 30
  const pileRightX = midX + 22
  const aquariumX = midX + 42
  const couchX = midX + 70
  const plantX = midX + 85

  return {
    floorY, midX, groundY, deskX, deskY, shelfX,
    pileLeftX, pileRightX, aquariumX, couchX, plantX,
    deskLobsterX: midX,
    deskLobsterY: deskY - 3,
    doneLobsterX: pileRightX + 4,
    doneLobsterY: groundY,
  }
}

export function computeWaypoints(layout) {
  const { shelfX, pileLeftX, midX, deskY, pileRightX, aquariumX, couchX, groundY, floorY } = layout
  return [
    { x: shelfX + 7, y: groundY, pause: 45 },
    { x: pileLeftX + 4, y: groundY, pause: 30 },
    { x: midX, y: groundY, seatY: deskY - 3, pause: 50, atDesk: true },
    { x: pileRightX + 4, y: groundY, pause: 30 },
    { x: aquariumX + 7, y: groundY, pause: 40 },
    { x: couchX, y: groundY, seatY: floorY - 12, pause: 60 },
  ]
}

export function createLobster() {
  return {
    x: 0,
    y: 0,
    phase: 'roaming',
    targetX: 0,
    targetY: 0,
    waypointIndex: 0,
    pauseRemaining: 0,
    walking: false,
    facing: 1,
    initialized: false,
    prevBotState: 'idle',
    roamSubPhase: 'paused',
  }
}

export function updateLobster(lobster, botState, layout) {
  const waypoints = computeWaypoints(layout)

  if (!lobster.initialized) {
    initLobster(lobster, botState, layout, waypoints)
    return
  }

  handleTransitions(lobster, botState, layout, waypoints)
  lobster.prevBotState = botState

  switch (lobster.phase) {
    case 'roaming':
      updateRoaming(lobster, waypoints)
      break
    case 'walk_to_desk':
      if (walkToward(lobster, layout.deskLobsterX, layout.deskLobsterY)) {
        lobster.phase = 'working'
        lobster.walking = false
      }
      break
    case 'working':
      lobster.x = layout.deskLobsterX
      lobster.y = layout.deskLobsterY
      lobster.walking = false
      break
    case 'walk_to_done':
      if (walkToward(lobster, layout.doneLobsterX, layout.doneLobsterY)) {
        lobster.phase = 'celebrating'
        lobster.walking = false
      }
      break
    case 'celebrating':
      lobster.x = layout.doneLobsterX
      lobster.y = layout.doneLobsterY
      lobster.walking = false
      break
    case 'walk_to_idle': {
      const wp = waypoints[lobster.waypointIndex]
      if (walkToward(lobster, wp.x, wp.y)) {
        lobster.phase = 'roaming'
        if (wp.seatY) {
          lobster.roamSubPhase = 'climbing'
          lobster.targetX = wp.x
          lobster.targetY = wp.seatY
        } else {
          lobster.pauseRemaining = wp.pause
          lobster.roamSubPhase = 'paused'
          lobster.walking = false
        }
      }
      break
    }
  }
}

function initLobster(lobster, botState, layout, waypoints) {
  lobster.initialized = true
  lobster.prevBotState = botState

  if (botState === 'working') {
    lobster.x = waypoints[0].x
    lobster.y = waypoints[0].y
    lobster.phase = 'walk_to_desk'
    lobster.walking = true
  } else if (botState === 'celebrating') {
    lobster.x = layout.doneLobsterX
    lobster.y = layout.doneLobsterY
    lobster.phase = 'celebrating'
    lobster.walking = false
  } else {
    lobster.x = waypoints[0].x
    lobster.y = waypoints[0].y
    lobster.waypointIndex = 0
    lobster.pauseRemaining = waypoints[0].pause
    lobster.phase = 'roaming'
    lobster.roamSubPhase = 'paused'
    lobster.walking = false
  }
}

function handleTransitions(lobster, botState, layout, waypoints) {
  if (botState === lobster.prevBotState) return

  if (botState === 'working') {
    lobster.phase = 'walk_to_desk'
    lobster.walking = true
  } else if (botState === 'celebrating') {
    lobster.phase = 'walk_to_done'
    lobster.walking = true
  } else if (botState === 'idle') {
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < waypoints.length; i++) {
      const dx = waypoints[i].x - lobster.x
      const dy = waypoints[i].y - lobster.y
      const dist = Math.abs(dx) + Math.abs(dy)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    }
    lobster.waypointIndex = nearest
    lobster.phase = 'walk_to_idle'
    lobster.walking = true
  }
}

function walkToward(lobster, destX, destY) {
  const dx = destX - lobster.x
  const dy = destY - lobster.y
  const dist = Math.abs(dx) + Math.abs(dy)

  if (dist <= WALK_SPEED) {
    lobster.x = destX
    lobster.y = destY
    lobster.walking = false
    return true
  }

  const ratio = WALK_SPEED / dist
  lobster.x += dx * ratio
  lobster.y += dy * ratio
  lobster.walking = true

  if (Math.abs(dx) > 0.01) {
    lobster.facing = dx > 0 ? 1 : -1
  }

  return false
}

function updateRoaming(lobster, waypoints) {
  const wp = waypoints[lobster.waypointIndex]

  if (lobster.pauseRemaining > 0) {
    lobster.pauseRemaining--
    lobster.walking = false
    // Keep position synced with layout during pause
    lobster.x = wp.x
    if (wp.seatY) lobster.y = wp.seatY
    else lobster.y = wp.y

    if (lobster.pauseRemaining === 0) {
      if (wp.seatY) {
        lobster.roamSubPhase = 'descending'
        lobster.targetX = wp.x
        lobster.targetY = wp.y
      } else {
        lobster.roamSubPhase = 'leaving'
      }
    }
    return
  }

  switch (lobster.roamSubPhase) {
    case 'descending':
      if (walkToward(lobster, lobster.targetX, lobster.targetY)) {
        advanceWaypoint(lobster, waypoints)
      }
      break
    case 'leaving':
      advanceWaypoint(lobster, waypoints)
      break
    case 'walking': {
      const target = waypoints[lobster.waypointIndex]
      if (walkToward(lobster, target.x, target.y)) {
        if (wp.seatY) {
          lobster.roamSubPhase = 'climbing'
          lobster.targetX = wp.x
          lobster.targetY = wp.seatY
        } else {
          lobster.pauseRemaining = wp.pause
          lobster.roamSubPhase = 'paused'
          lobster.walking = false
        }
      }
      break
    }
    case 'climbing':
      if (walkToward(lobster, lobster.targetX, lobster.targetY)) {
        lobster.pauseRemaining = wp.pause
        lobster.roamSubPhase = 'paused'
        lobster.walking = false
      }
      break
    case 'paused':
      advanceWaypoint(lobster, waypoints)
      break
  }
}

function advanceWaypoint(lobster, waypoints) {
  lobster.waypointIndex = (lobster.waypointIndex + 1) % waypoints.length
  const next = waypoints[lobster.waypointIndex]
  lobster.targetX = next.x
  lobster.targetY = next.y
  lobster.roamSubPhase = 'walking'
  lobster.walking = true
}
