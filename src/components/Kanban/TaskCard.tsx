import React, { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { formatTime, formatDuration, formatRelativeTime } from '@/lib/time'
import { useTimezone } from '../TimezoneContext'
import { GripVertical, Trash2, Play, AlertCircle, Loader2, Clock, CheckCircle2, ChevronDown, ChevronUp, FileText, Timer, Paperclip, MessageCircle } from 'lucide-react'
import { AttachmentBadge, AttachmentThumbnails } from './AttachmentSection'
import MarkdownRenderer from '../Markdown/MarkdownRenderer'
import type { Task } from '@/types/api'

function truncateResult(text: string | null | undefined, maxLen = 120): string {
  if (!text) return ''
  const oneLine = text.replace(/\n/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return oneLine.slice(0, maxLen) + '\u2026'
}

export function extractFilePaths(text: string | null | undefined): string[] {
  if (!text) return []
  const pathRegex = /(?:[\w.\-]+\/)+[\w.\-]+\.[\w]+/g
  const matches = text.match(pathRegex) || []
  return [...new Set(matches)]
}

function describeSchedule(s: string | null | undefined): string | null {
  if (!s) return null
  if (s === 'daily') return 'Every day'
  if (s === 'weekly') return 'Every week'
  if (s === 'monthly') return 'Every month'
  const parts = s.trim().split(/\s+/)
  if (parts.length !== 5) return s
  const [, hour, dom, mon] = parts
  if (hour === '*') return 'Every hour'
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`
  if (dom.startsWith('*/')) {
    const n = parseInt(dom.slice(2)) || 1
    if (n % 7 === 0) return n === 7 ? 'Every week' : `Every ${n / 7} weeks`
    return n === 1 ? 'Every day' : `Every ${n} days`
  }
  if (mon.startsWith('*/')) { const n = parseInt(mon.slice(2)) || 1; return n === 1 ? 'Every month' : `Every ${n} months` }
  if (dom === '1' && mon === '*') return 'Every month'
  if (dom === '*' && mon === '*') return 'Every day'
  return s
}

function formatNextRun(iso: string | null | undefined, tz: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  if (diffMs < 0) return 'overdue'
  if (diffMs < 3600000) return `in ${Math.max(1, Math.round(diffMs / 60000))}m`
  if (diffMs < 86400000) return `in ${Math.round(diffMs / 3600000)}h`
  return d.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })
}

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onView?: (task: Task) => void
  onDelete?: (id: string) => void
  onRun?: (id: string) => void
  onToggleSchedule?: (id: string, enabled: boolean) => void
  isDragging?: boolean
}

export default function TaskCard({ task, onEdit, onView, onDelete, onRun, onToggleSchedule, isDragging: isDraggingProp }: TaskCardProps) {
  const { timezone } = useTimezone()
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: task.status === 'done' || task.status === 'in-progress' })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const dragging = isDraggingProp || isDragging
  const isInProgress = task.status === 'in-progress'
  const isDone = task.status === 'done'
  const hasError = !!task.error
  const canRun = task.status === 'backlog' || task.status === 'todo'
  const canEdit = !isDone && !isInProgress
  const hasSchedule = !!task.schedule
  const schedulePaused = hasSchedule && task.scheduleEnabled === false

  const skillsList = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])
  const duration = isDone ? formatDuration(task.startedAt || task.createdAt, task.completedAt) : null
  const resultSummary = !hasError ? truncateResult(task.result) : null
  const hasFullResult = task.result && task.result.length > 120
  const filePaths = isDone ? extractFilePaths(task.result) : []

  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!isInProgress || !task.startedAt) return
    const tick = () => setElapsed(formatDuration(task.startedAt, new Date().toISOString()) || '')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isInProgress, task.startedAt])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 transition-shadow',
        !isDone && !isInProgress && 'cursor-grab active:cursor-grabbing',
        (isDone || isInProgress) && 'cursor-pointer',
        dragging && !isDraggingProp && 'opacity-30',
        isInProgress && 'border-amber-500/50 animate-pulse-subtle',
        hasError && 'border-red-500/50',
        isDone && !hasError && 'border-green-500/20 bg-card/60 opacity-80',
        isDone && hasError && 'bg-card/60 opacity-80',
        hasSchedule && !isDone && !isInProgress && !schedulePaused && 'border-l-2 border-l-orange-400/70',
        hasSchedule && !isDone && !isInProgress && schedulePaused && 'border-l-2 border-l-orange-400/30'
      )}
      onClick={() => {
        if (isDone && onView) {
          onView(task)
        } else if (canEdit && onEdit) {
          onEdit(task)
        } else if (!canEdit && onView) {
          onView(task)
        }
      }}
      {...((isDone || isInProgress) ? {} : { ...attributes, ...listeners })}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!isDone && !isInProgress && <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />}
            {isInProgress && <Loader2 size={12} className="text-amber-400 animate-spin shrink-0" />}
            {isDone && !hasError && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
            {isDone && hasError && <AlertCircle size={14} className="text-red-500 shrink-0" />}
            <p className={cn('text-sm font-medium truncate', isDone && 'text-foreground/70')}>{task.title}</p>
          </div>

          {isDone && !expanded && resultSummary && (
            <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 italic">{resultSummary}</p>
          )}

          {isDone && !expanded && hasError && (
            <p className="text-[11px] text-red-400/80 mt-1 line-clamp-2 italic">{truncateResult(task.error, 120)}</p>
          )}

          {isDone && expanded && (
            <div className="mt-2">
              {hasError && (
                <div className="mb-2">
                  <span className="text-red-400 font-medium text-[11px]">Error:</span>
                  <MarkdownRenderer
                    content={task.error!}
                    isError={true}
                    showToggle={false}
                    size="xs"
                    maxHeight="max-h-48"
                    className="mt-1"
                  />
                </div>
              )}
              {task.result && (
                <MarkdownRenderer
                  content={task.result}
                  isError={false}
                  showToggle={false}
                  size="xs"
                  maxHeight="max-h-48"
                />
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {isDone && (task.result || task.error) && (
            <span className="text-muted-foreground/50">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canRun && onRun && (
              <button
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); onRun(task.id) }}
                onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                className="text-muted-foreground hover:text-green-400 transition-colors"
                title="Execute immediately"
              >
                <Play size={12} />
              </button>
            )}

            {onDelete && (
              <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(task.id) }} onPointerDown={(e: React.PointerEvent) => e.stopPropagation()} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {skillsList.map(sk => (
          <span key={sk} className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full',
            isDone && !hasError ? 'bg-orange-500/10 text-orange-400/60' : 'bg-orange-500/20 text-orange-400'
          )}>{sk}</span>
        ))}
        {task.channel && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
            <MessageCircle size={10} /> {task.channel}
          </span>
        )}
        {task.source && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400" title={`Source: ${task.source}`}>
            <MessageCircle size={10} /> {task.source}
          </span>
        )}
        {hasError && !isDone && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
            <AlertCircle size={10} /> Error
          </span>
        )}
        <AttachmentBadge count={task.attachments?.length} />
      </div>

      <AttachmentThumbnails taskId={task.id} attachments={task.attachments} />

      {hasSchedule && !isDone && (
        <div className={cn('flex items-center gap-1 text-[10px] mt-1.5', schedulePaused ? 'text-muted-foreground/50' : 'text-orange-400/80')}>
          <Timer size={10} className="shrink-0" />
          <span className={schedulePaused ? 'line-through' : ''}>{describeSchedule(task.schedule)}</span>
          {!schedulePaused && task.scheduledAt && (
            <span className="text-muted-foreground">· next: {formatNextRun(task.scheduledAt, timezone)}</span>
          )}
          {schedulePaused && onToggleSchedule && (
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleSchedule(task.id, true) }}
              className="text-orange-400/60 hover:text-orange-400 hover:underline transition-colors"
            >
              · paused — resume
            </button>
          )}
          {schedulePaused && !onToggleSchedule && <span>· paused</span>}
          {!schedulePaused && onToggleSchedule && (
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleSchedule(task.id, false) }}
              className="text-muted-foreground/50 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              · pause
            </button>
          )}
        </div>
      )}

      {isInProgress && task.startedAt && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5">
          <span>Started {formatTime(task.startedAt, timezone)}</span>
          {elapsed && <span className="text-amber-400 font-medium flex items-center gap-0.5"><Clock size={10} />{elapsed}</span>}
          {task.subagentId && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-mono truncate max-w-[80px]" title={task.subagentId}>
              {task.subagentId.slice(0, 8)}
            </span>
          )}
        </div>
      )}

      {isDone && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-1.5">
          <span className="flex items-center gap-0.5">
            <Clock size={9} className="shrink-0" />
            Completed {formatRelativeTime(task.completedAt)}
            {duration && <span className="text-muted-foreground/40"> in {duration}</span>}
          </span>
        </div>
      )}

      {filePaths.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {filePaths.slice(0, 3).map(fp => (
            <span key={fp} className="inline-flex items-center gap-0.5 text-[10px] text-blue-400/80 bg-blue-500/10 rounded px-1.5 py-0.5 truncate max-w-[180px]" title={fp}>
              <FileText size={9} className="shrink-0" />
              {fp.split('/').pop()}
            </span>
          ))}
          {filePaths.length > 3 && (
            <span className="text-[10px] text-muted-foreground/50">+{filePaths.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  )
}
