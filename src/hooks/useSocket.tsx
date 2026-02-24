import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type SocketCallback = (data: unknown) => void

interface SocketContextValue {
  subscribe: (type: string, callback: SocketCallback) => () => void
  connected: boolean
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Map<string, Set<SocketCallback>>())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let attempts = 0

    function connect() {
      let wsUrl: string
      if (typeof __WS_TARGET__ !== 'undefined' && __WS_TARGET__) {
        wsUrl = __WS_TARGET__.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '') + '/ws'
      } else {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${location.host}/ws`
      }
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.addEventListener('open', () => {
        attempts = 0
        setConnected(true)
      })

      ws.addEventListener('message', (event) => {
        try {
          const { type, data } = JSON.parse(event.data)
          const callbacks = listenersRef.current.get(type)
          if (callbacks) callbacks.forEach(cb => cb(data))
        } catch {}
      })

      ws.addEventListener('close', () => {
        setConnected(false)
        wsRef.current = null
        const delay = Math.min(1000 * 2 ** attempts, 30000)
        attempts++
        reconnectTimer.current = setTimeout(connect, delay)
      })

      ws.addEventListener('error', () => {
        ws.close()
      })
    }

    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const subscribe = (type: string, callback: SocketCallback): (() => void) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set())
    listenersRef.current.get(type)!.add(callback)
    return () => {
      const set = listenersRef.current.get(type)
      if (set) {
        set.delete(callback)
        if (set.size === 0) listenersRef.current.delete(type)
      }
    }
  }

  return (
    <SocketContext.Provider value={{ subscribe, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket(type: string, callback: SocketCallback): void {
  const ctx = useContext(SocketContext)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!ctx) return
    const handler = (data: unknown) => callbackRef.current(data)
    return ctx.subscribe(type, handler)
  }, [ctx, type])
}

export function useSocketStatus(): boolean {
  const ctx = useContext(SocketContext)
  return ctx?.connected ?? false
}
