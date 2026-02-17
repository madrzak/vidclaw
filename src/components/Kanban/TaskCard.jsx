import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useTimezone } from '../TimezoneContext'
import { useNavigation } from '../NavigationContext'
import { GripVertical, Pencil, Trash2, Play, AlertCircle, ChevronDown, ChevronUp, Loader2, FileText, Clock, Pause, RotateCcw, CheckCircle2 } from 'lucide-react'

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

export default function TaskCard({ task, onEdit, onDelete, onRun, isDragging: isDraggingProp }) {
  const [expanded, setExpanded] = useState(false)
  const { timezone } = useTimezone()
  const { navigateToFile } = useNavigation()
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

  const skillsList = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])
  const artifacts = extractFilePaths(task.result)
  const duration = isDone ? formatDuration(task.startedAt || task.createdAt, task.completedAt) : null
  const resultSummary = isDone && !hasError ? truncateResult(task.result) : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow',
        dragging && !isDraggingProp && 'opacity-30',
        isInProgress && 'border-amber-500/50 animate-pulse-subtle',
        hasError && 'border-red-500/50',
        isDone && !hasError && 'opacity-70 border-border/50 bg-card/60'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
            {isInProgress && <Loader2 size={12} className="text-amber-400 animate-spin shrink-0" />}
            {isDone && !hasError && <CheckCircle2 size={12} className="text-green-500/70 shrink-0" />}
            <p className={cn(
              'text-sm font-medium truncate',
              isDone && !hasError && 'text-muted-foreground'
            )}>{task.title}</p>
          </div>
          {/* Show description for non-done tasks */}
          {task.description && !isDone && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          {/* Show result summary inline for done tasks */}
          {isDone && resultSummary && !expanded && (
            <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 italic">{resultSummary}</p>
          )}
          {/* Show error summary inline for errored done tasks */}
          {isDone && hasError && !expanded && (
            <p className="text-[11px] text-red-400/80 mt-1 line-clamp-1 italic">{truncateResult(task.error, 80)}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(task) }} onPointerDown={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground">
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id) }} onPointerDown={e => e.stopPropagation()} className="text-muted-foreground hover:text-destructive">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Skills and error badges - always show */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {skillsList.map(sk => (
          <span key={sk} className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full',
            isDone && !hasError ? 'bg-orange-500/10 text-orange-400/60' : 'bg-orange-500/20 text-orange-400'
          )}>{sk}</span>
        ))}
        {hasError && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
            <AlertCircle size={10} /> Error
          </span>
        )}
      </div>

      {isInProgress && task.startedAt && (
        <p className="text-[10px] text-muted-foreground mt-1.5">Started {formatTime(task.startedAt, timezone)}</p>
      )}

      {isDone && (
        <div className="mt-1.5 space-y-1">
          {/* Completion time and duration on one line */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
            {task.completedAt && (
              <span className="flex items-center gap-0.5">
                <Clock size={9} className="shrink-0" />
                {formatTime(task.completedAt, timezone)}
              </span>
            )}
            {duration && (
              <span className="text-muted-foreground/50">({duration})</span>
            )}
          </div>

          {/* Expandable result/error details */}
          {(task.result || task.error) && (
            <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {expanded ? 'Collapse' : (task.error ? 'Error Details' : 'Full Result')}
              </button>
              {expanded && (
                <>
                  <pre className={cn(
                    'mt-1 text-[10px] font-mono p-2 rounded-md max-h-32 overflow-auto whitespace-pre-wrap break-words',
                    task.error ? 'bg-red-500/10 text-red-300' : 'bg-secondary/50 text-muted-foreground'
                  )}>
                    {task.error || task.result}
                  </pre>
                  {artifacts.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Artifacts</span>
                      {artifacts.map((fp, i) => (
                        <button
                          key={i}
                          onClick={() => navigateToFile(fp)}
                          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-mono transition-colors w-full text-left"
                          title={`Open ${fp} in file browser`}
                        >
                          <FileText size={9} className="shrink-0" />
                          <span className="truncate">{fp}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
