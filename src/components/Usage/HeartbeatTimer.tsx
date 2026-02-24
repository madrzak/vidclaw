import React, { useState, useEffect } from 'react'
import { HeartPulse } from 'lucide-react'
import { useSocket, useSocketStatus } from '../../hooks/useSocket'
import { useSettings } from '@/hooks/queries/useSettings'
import { api } from '@/lib/api'

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000

function parseInterval(str: string | null | undefined): number {
  if (!str) return DEFAULT_INTERVAL_MS
  const m = str.match(/^(\d+)\s*(m|h)$/i)
  if (!m) return DEFAULT_INTERVAL_MS
  const val = parseInt(m[1])
  return m[2].toLowerCase() === 'h' ? val * 60 * 60 * 1000 : val * 60 * 1000
}

interface HeartbeatSocketData {
  lastHeartbeat?: number
}

export default function HeartbeatTimer(): React.ReactElement | null {
  const [lastBeat, setLastBeat] = useState<number | null>(null)
  const [now, setNow] = useState<number>(Date.now())
  const wsConnected = useSocketStatus()

  const { data: settings } = useSettings()
  const intervalMs = parseInterval(settings?.heartbeatEvery)

  useEffect(() => {
    const stored = localStorage.getItem('lastHeartbeat')
    if (stored) setLastBeat(parseInt(stored))

    const iv = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    api.heartbeat.get()
      .then(data => {
        if (data.lastHeartbeat) {
          setLastBeat(data.lastHeartbeat)
          localStorage.setItem('lastHeartbeat', data.lastHeartbeat.toString())
        }
      })
      .catch(() => {})
  }, [])

  useSocket('heartbeat', (data: unknown) => {
    const d = data as HeartbeatSocketData
    if (d.lastHeartbeat) {
      setLastBeat(d.lastHeartbeat)
      localStorage.setItem('lastHeartbeat', d.lastHeartbeat.toString())
    }
  })

  if (!lastBeat) return null

  const nextBeat = lastBeat + intervalMs
  const remaining = Math.max(0, nextBeat - now)
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  const overdue = remaining === 0
  let label: string
  if (overdue) label = 'due'
  else if (minutes < 1) label = '<1m'
  else label = `${minutes}m`

  const isImminent = minutes < 1

  const iconClass = !wsConnected
    ? 'text-red-400'
    : isImminent
      ? 'text-orange-400 animate-pulse'
      : 'text-green-400'

  const tooltip = !wsConnected
    ? 'Live updates disconnected'
    : overdue
      ? 'Execution window overdue — waiting for next heartbeat'
      : `Next execution window in ${minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}`

  return (
    <div className="relative group flex items-center gap-1 text-[10px] text-muted-foreground cursor-default">
      <HeartPulse size={11} className={iconClass} />
      <span>{label}</span>
      <div className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-popover border border-border rounded text-[10px] text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-[9999]">
        {tooltip}
      </div>
    </div>
  )
}
