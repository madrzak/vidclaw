import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../../hooks/useSocket.jsx'
import { FRAME_INTERVAL, STATE_LABELS } from './constants'
import { drawScene } from './scene'
import { deriveState } from './deriveState'

export default function PixelBotView({ onAddTask }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const animRef = useRef(null)
  const lastFrameTime = useRef(0)
  const celebratingRef = useRef({ seenDoneIds: new Set(), celebrateUntil: 0 })
  const countsRef = useRef({ backlog: 0, todo: 0, 'in-progress': 0, done: 0 })
  const [tasks, setTasks] = useState([])
  const [botState, setBotState] = useState('idle')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data)
    } catch {}
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useSocket('tasks', (newTasks) => { setTasks(newTasks) })

  useEffect(() => {
    setBotState(deriveState(tasks, celebratingRef))
    countsRef.current = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    }
  }, [tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let paused = document.hidden

    const animate = (timestamp) => {
      if (paused) return
      animRef.current = requestAnimationFrame(animate)
      const elapsed = timestamp - lastFrameTime.current
      if (elapsed < FRAME_INTERVAL) return
      lastFrameTime.current = timestamp - (elapsed % FRAME_INTERVAL)
      frameRef.current = (frameRef.current + 1) % 10000
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      drawScene(ctx, w, h, frameRef.current, botState, countsRef.current)
    }

    const onVisibility = () => {
      paused = document.hidden
      if (!paused && !animRef.current) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    animRef.current = requestAnimationFrame(animate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }, [botState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const MIN_WIDTH = 1320
    const resize = () => {
      const container = canvas.parentElement
      canvas.height = container.clientHeight
      canvas.width = Math.max(MIN_WIDTH, container.clientWidth)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const label = STATE_LABELS[botState]
  const counts = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
        <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{counts.backlog} backlog</span>
          <span>{counts.todo} todo</span>
          <span className="text-amber-500">{counts['in-progress']} active</span>
          <span className="text-green-500">{counts.done} done</span>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="ml-2 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 rounded-lg overflow-x-auto overflow-y-hidden border border-zinc-800 bg-[#0c0a09] relative" style={{ imageRendering: 'pixelated' }}>
        <canvas ref={canvasRef} className="h-full" />
      </div>
    </div>
  )
}
