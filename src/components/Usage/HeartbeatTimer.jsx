import React, { useState, useEffect } from 'react'
import { HeartPulse } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket.jsx'

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000

function parseInterval(str) {
  if (!str) return DEFAULT_INTERVAL_MS
  const m = str.match(/^(\d+)\s*(m|h)$/i)
  if (!m) return DEFAULT_INTERVAL_MS
  const val = parseInt(m[1])
  return m[2].toLowerCase() === 'h' ? val * 60 * 60 * 1000 : val * 60 * 1000
}

export default function HeartbeatTimer() {
  const [lastBeat, setLastBeat] = useState(null)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_INTERVAL_MS)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const stored = localStorage.getItem('lastHeartbeat')
    if (stored) setLastBeat(parseInt(stored))

    const iv = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    async function checkBeat() {
      try {
        const res = await fetch('api/heartbeat')
        if (res.ok) {
          const data = await res.json()
          if (data.lastHeartbeat) {
            setLastBeat(data.lastHeartbeat)
            localStorage.setItem('lastHeartbeat', data.lastHeartbeat.toString())
          }
        }
      } catch {}
    }
    async function fetchInterval() {
      try {
        const res = await fetch('api/settings')
        if (res.ok) {
          const data = await res.json()
          const val = data.heartbeatInterval || data.heartbeatEvery
          if (val) setIntervalMs(parseInterval(val))
        }
      } catch {}
    }
    checkBeat()
    fetchInterval()
  }, [])

  useSocket('heartbeat', (data) => {
    if (data.lastHeartbeat) {
      setLastBeat(data.lastHeartbeat)
      localStorage.setItem('lastHeartbeat', data.lastHeartbeat.toString())
    }
  })

  useSocket('settings', (data) => {
    const val = data.heartbeatInterval || data.heartbeatEvery
    if (val) setIntervalMs(parseInterval(val))
  })

  if (!lastBeat) return null

  const nextBeat = lastBeat + intervalMs
  const remaining = Math.max(0, nextBeat - now)
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  const overdue = remaining === 0
  let label
  if (overdue) label = 'due'
  else if (minutes < 1) label = '<1m'
  else label = `${minutes}m`

  const isImminent = minutes < 1

  return (
    <div className="relative group flex items-center gap-1 text-[10px] text-muted-foreground cursor-default">
      <HeartPulse size={11} className={isImminent ? 'text-orange-400 animate-pulse' : ''} />
      <span>{label}</span>
      <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-popover border border-border rounded text-[10px] text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-[9999]">
        {overdue ? 'Execution window overdue — waiting for next heartbeat' : `Next execution window in ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}`}
      </div>
    </div>
  )
}
