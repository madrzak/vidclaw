import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useTimezone } from '../TimezoneContext'
import { GripVertical, Trash2, Play, AlertCircle, Loader2, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

function formatTime(iso, tz) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null
  const ms = new Date(endIso) - new Date(startIso)
  if (ms < 0) return null
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ${secs % 60}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  const now = Date.now()
  const diff = now - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function truncateResult(text, maxLen = 120) {
  if (!text) return ''
  const oneLine = text.replace(/\n/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return oneLine.slice(0, maxLen) + '…'
}

// Extract file paths from task result text
export function extractFilePaths(text) {
  if (!text) return []
  const pathRegex = /(?:\/[\w.\-]+)+(?:\.[\w]+)?/g
  const matches = text.match(pathRegex) || []
  return [...new Set(matches.filter(p => /\.\w+$/.test(p) || p.includes('/workspace/')))]
}

export default function TaskCard({ task, onEdit, onView, onDelete, onRun, isDragging: isDraggingProp }) {
  const { timezone } = useTimezone()
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

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

  const skillsList = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])
  const duration = isDone ? formatDuration(task.startedAt || task.createdAt, task.completedAt) : null
  const resultSummary = !hasError ? truncateResult(task.result) : null
  const hasFullResult = task.result && task.result.length > 120

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow',
        dragging && !isDraggingProp && 'opacity-30',
        isInProgress && 'border-amber-500/50 animate-pulse-subtle',
        hasError && 'border-red-500/50',
        isDone && !hasError && 'border-green-500/20 bg-card/60 opacity-80',
        isDone && hasError && 'bg-card/60 opacity-80'
      )}
      onClick={() => {
        if (isDone && (task.result || task.error)) {
          setExpanded(prev => !prev)
        } else if (canEdit && onEdit) {
          onEdit(task)
        } else if (!canEdit && onView) {
          onView(task)
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
            {isInProgress && <Loader2 size={12} className="text-amber-400 animate-spin shrink-0" />}
            {isDone && !hasError && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
            {isDone && hasError && <AlertCircle size={14} className="text-red-500 shrink-0" />}
            <p className={cn('text-sm font-medium truncate', isDone && 'text-foreground/70')}>{task.title}</p>
          </div>

          {/* Result summary for done tasks (collapsed view) */}
          {isDone && !expanded && resultSummary && (
            <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 italic">{resultSummary}</p>
          )}

          {/* Error summary for errored done tasks (collapsed view) */}
          {isDone && !expanded && hasError && (
            <p className="text-[11px] text-red-400/80 mt-1 line-clamp-2 italic">{truncateResult(task.error, 120)}</p>
          )}

          {/* Expanded full result preview */}
          {isDone && expanded && (
            <div className="mt-2 text-[11px] rounded-md bg-muted/50 p-2 max-h-48 overflow-y-auto">
              {hasError && (
                <div className="mb-2">
                  <span className="text-red-400 font-medium">Error:</span>
                  <pre className="text-red-400/80 whitespace-pre-wrap mt-0.5 font-mono text-[10px]">{task.error}</pre>
                </div>
              )}
              {task.result && (
                <pre className="text-muted-foreground whitespace-pre-wrap font-mono text-[10px]">{task.result}</pre>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {/* Expand/collapse indicator for done tasks */}
          {isDone && (task.result || task.error) && (
            <span className="text-muted-foreground/50">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canRun && onRun && (
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRun(task.id) }}
                onPointerDown={e => e.stopPropagation()}
                className="text-muted-foreground hover:text-green-400 transition-colors"
                title="Execute immediately"
              >
                <Play size={12} />
              </button>
            )}

            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} onPointerDown={e => e.stopPropagation()} className="text-muted-foreground hover:text-destructive">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Skills and error badges */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {skillsList.map(sk => (
          <span key={sk} className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full',
            isDone && !hasError ? 'bg-orange-500/10 text-orange-400/60' : 'bg-orange-500/20 text-orange-400'
          )}>{sk}</span>
        ))}
        {hasError && !isDone && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
            <AlertCircle size={10} /> Error
          </span>
        )}
      </div>

      {isInProgress && task.startedAt && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Started {formatTime(task.startedAt, timezone)}</p>
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
    </div>
  )
}
