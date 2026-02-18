import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useTimezone } from '../TimezoneContext'
import { GripVertical, Pencil, Trash2, Play, AlertCircle, ChevronDown, ChevronUp, Loader2, FileText, Clock } from 'lucide-react'

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null
  const ms = new Date(endIso) - new Date(startIso)
  if (ms < 0) return null
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatTime(iso, tz) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

// Extract file paths from task result text
function extractFilePaths(text) {
  if (!text) return []
  const pathRegex = /(?:\/[\w.\-]+)+(?:\.[\w]+)?/g
  const matches = text.match(pathRegex) || []
  // Filter to likely file paths (must have an extension or be in a known directory)
  return [...new Set(matches.filter(p => /\.\w+$/.test(p) || p.includes('/workspace/')))]
}

export default function TaskCard({ task, onEdit, onDelete, onRun, isDragging: isDraggingProp }) {
  const [expanded, setExpanded] = useState(false)
  const { timezone } = useTimezone()
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow',
        dragging && !isDraggingProp && 'opacity-30',
        isInProgress && 'border-amber-500/50 animate-pulse-subtle',
        hasError && 'border-red-500/50'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <GripVertical size={12} className="text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
            {isInProgress && <Loader2 size={12} className="text-amber-400 animate-spin shrink-0" />}
            <p className="text-sm font-medium truncate">{task.title}</p>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
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

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {skillsList.map(sk => (
          <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{sk}</span>
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
          {task.completedAt && (
            <p className="text-[10px] text-muted-foreground">
              Completed {formatTime(task.completedAt, timezone)}
              {task.startedAt && formatDuration(task.startedAt, task.completedAt) && (
                <span className="inline-flex items-center gap-0.5 ml-1.5 text-emerald-400">
                  <Clock size={9} /> {formatDuration(task.startedAt, task.completedAt)}
                </span>
              )}
            </p>
          )}
          {(task.result || task.error) && (
            <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {task.error ? 'Error Details' : 'Result'}
              </button>
              {expanded && (
                <>
                  <pre className={cn(
                    'mt-1 text-[10px] font-mono p-2 rounded-md max-h-32 overflow-auto',
                    task.error ? 'bg-red-500/10 text-red-300' : 'bg-secondary text-muted-foreground'
                  )}>
                    {task.error || task.result}
                  </pre>
                  {extractFilePaths(task.result).length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Files</span>
                      {extractFilePaths(task.result).map((fp, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                          <FileText size={9} className="shrink-0" />
                          <span className="truncate" title={fp}>{fp}</span>
                        </div>
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
