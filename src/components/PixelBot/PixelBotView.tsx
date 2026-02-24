import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { FRAME_INTERVAL, STATE_LABELS } from './constants'
import HeartbeatTimer from '../Usage/HeartbeatTimer'
import { drawScene } from './scene'
import { deriveState } from './deriveState'
import type { BotStateRef } from './deriveState'
import { createLobster } from './lobsterAI'
import { api } from '@/lib/api'
import type { Task } from '@/types/api'

interface PixelBotViewProps {
  onAddTask?: () => void
  visible?: boolean
}

export default function PixelBotView({ onAddTask, visible = true }: PixelBotViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frameRef = useRef(Math.floor(Math.random() * 10000))
  const animRef = useRef<number | null>(null)
  const lastFrameTime = useRef(0)
  const stateRef = useRef<BotStateRef>({ seenDoneIds: new Set<string>(), seenInProgressIds: new Set<string>(), celebrateUntil: 0, workingUntil: 0, pendingCelebration: false })
  const countsRef = useRef({ backlog: 0, todo: 0, 'in-progress': 0, done: 0 })
  const lobsterRef = useRef(createLobster())
  const botStateRef = useRef('idle')
  const visibleRef = useRef(visible)
  const resizeRef = useRef<(() => void) | null>(null)
  const animateFnRef = useRef<((timestamp: number) => void) | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [botState, setBotState] = useState('idle')

  const fetchTasks = useCallback(async (): Promise<void> => {
    try {
      const data = await api.tasks.list()
      setTasks(data || [])
    } catch {}
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useSocket('tasks', (newTasks: unknown) => { setTasks(newTasks as Task[]) })

  useEffect(() => {
    if (tasks.length === 0) return
    const newState = deriveState(tasks, stateRef)
    setBotState(newState)
    botStateRef.current = newState
    countsRef.current = {
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
    }
  }, [tasks])

  useEffect(() => {
    if (tasks.length === 0) return
    const interval = setInterval(() => {
      const newState = deriveState(tasks, stateRef)
      setBotState(newState)
      botStateRef.current = newState
    }, 1000)
    return () => clearInterval(interval)
  }, [tasks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const MIN_WIDTH = 1320

    const resize = () => {
      const container = canvas.parentElement!
      canvas.height = container.clientHeight
      canvas.width = Math.max(MIN_WIDTH, container.clientWidth)
    }
    resizeRef.current = resize
    if (visibleRef.current) resize()

    const animate = (timestamp: number) => {
      if (document.hidden || !visibleRef.current) return
      animRef.current = requestAnimationFrame(animate)
      const elapsed = timestamp - lastFrameTime.current
      if (elapsed < FRAME_INTERVAL) return
      lastFrameTime.current = timestamp - (elapsed % FRAME_INTERVAL)
      frameRef.current = (frameRef.current + 1) % 10000
      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) return
      ctx.clearRect(0, 0, w, h)
      drawScene(ctx, w, h, frameRef.current, botStateRef.current, countsRef.current, lobsterRef.current)
    }
    animateFnRef.current = animate

    const onVisibility = () => {
      if (!document.hidden && visibleRef.current) {
        lastFrameTime.current = 0
        animRef.current = requestAnimationFrame(animate)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', resize)
    if (visibleRef.current) animRef.current = requestAnimationFrame(animate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      animRef.current = null
      animateFnRef.current = null
    }
  }, [])

  useEffect(() => {
    visibleRef.current = visible
    if (visible) {
      if (resizeRef.current) resizeRef.current()
      lastFrameTime.current = 0
      if (animateFnRef.current && !animRef.current) {
        animRef.current = requestAnimationFrame(animateFnRef.current)
      }
    } else {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
    }
  }, [visible])

  const label = STATE_LABELS[botState as keyof typeof STATE_LABELS]
  const counts = {
    backlog: tasks.filter(t => t.status === 'backlog').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between px-4 py-2 bg-card rounded-lg border border-border">
        <span className={`text-sm font-medium ${label.color}`}>{label.text}</span>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{counts.backlog} backlog</span>
          <span>{counts.todo} todo</span>
          <span className="text-amber-500">{counts['in-progress']} active</span>
          <span className="text-green-500">{counts.done} done</span>
          <HeartbeatTimer />
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="ml-2 px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
            >
              + Add Task
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 rounded-lg overflow-x-auto overflow-y-hidden border border-border bg-black relative" style={{ imageRendering: 'pixelated' }}>
        <canvas ref={canvasRef} className="h-full" />
      </div>
    </div>
  )
}
