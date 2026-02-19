import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const listenersRef = useRef(new Map())
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let attempts = 0

    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${location.host}/ws`)
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
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const subscribe = (type, callback) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set())
    listenersRef.current.get(type).add(callback)
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

export function useSocket(type, callback) {
  const ctx = useContext(SocketContext)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!ctx) return
    const handler = (data) => callbackRef.current(data)
    return ctx.subscribe(type, handler)
  }, [ctx, type])
}

export function useSocketStatus() {
  const ctx = useContext(SocketContext)
  return ctx?.connected ?? false
}
