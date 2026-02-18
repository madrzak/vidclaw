import React, { useState, useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { Plus, X } from 'lucide-react'
import 'xterm/css/xterm.css'

export default function Terminals({ visible }) {
  const [terminals, setTerminals] = useState([])
  const [nextId, setNextId] = useState(1)

  async function addTerminal() {
    const id = `term-${nextId}-${Date.now()}`
    const title = `Terminal ${nextId}`
    setNextId(n => n + 1)

    // Create backend terminal BEFORE mounting UI to avoid race condition
    await fetch('/api/terminals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cols: 80, rows: 24 }),
    })

    setTerminals(t => [...t, { id, title }])
  }

  async function removeTerminal(id) {
    await fetch(`/api/terminals/${id}`, { method: 'DELETE' })
    setTerminals(t => t.filter(term => term.id !== id))
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={addTerminal}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:brightness-110 transition-all"
        >
          <Plus size={14} /> New Terminal
        </button>
      </div>

      {terminals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center mx-auto mb-3">
              <span className="text-muted-foreground font-mono text-lg">_</span>
            </div>
            <p className="text-sm text-muted-foreground">Click "New Terminal" to spawn a shell</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto" style={{ gridAutoRows: '1fr' }}>
          {terminals.map(term => (
            <TerminalWindow
              key={term.id}
              id={term.id}
              title={term.title}
              visible={visible}
              onClose={() => removeTerminal(term.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TerminalWindow({ id, title, visible, onClose }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const pollingRef = useRef(null)

  // Re-fit terminal when tab becomes visible
  useEffect(() => {
    if (visible && fitRef.current) {
      setTimeout(() => fitRef.current.fit(), 50)
    }
  }, [visible])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      scrollback: 5000,
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: '#0c0e14',
        foreground: '#d4d4d8',
        cursor: '#f97316',
        cursorAccent: '#0c0e14',
        selectionBackground: '#f9731630',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#d4d4d8',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(containerRef.current)
    setTimeout(() => fitAddon.fit(), 100)

    termRef.current = term
    fitRef.current = fitAddon

    // Handle user input
    term.onData(async (data) => {
      await fetch(`/api/terminals/${id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
    })

    // Send resize to backend PTY
    term.onResize(({ cols, rows }) => {
      fetch(`/api/terminals/${id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols, rows }),
      })
    })

    const handleResize = () => {
      if (fitAddon) fitAddon.fit()
    }

    window.addEventListener('resize', handleResize)
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    // Polling for output
    const poll = async () => {
      try {
        const res = await fetch(`/api/terminals/${id}/output`)
        const data = await res.json()

        if (data.output) {
          term.write(data.output)
        }

        if (data.exited) {
          term.write('\r\n[Process exited]\r\n')
        } else {
          pollingRef.current = setTimeout(poll, 200)
        }
      } catch {}
    }

    poll()

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      clearTimeout(pollingRef.current)
      term.dispose()
    }
  }, [id])

  return (
    <div className="border border-border rounded-lg bg-[#0c0e14] overflow-hidden flex flex-col card-glow" style={{ minHeight: '300px', height: '100%' }}>
      <div className="flex items-center justify-between px-3 py-2 bg-[#111318] border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[12px] font-mono text-zinc-500 ml-1">{title}</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 pl-1 pt-1 pb-1" />
      </div>
    </div>
  )
}
