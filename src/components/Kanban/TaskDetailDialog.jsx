import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from 'react'
import { X, Bot, User, Activity, FileText, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractFilePaths } from './TaskCard'
import { useTimezone } from '../TimezoneContext'
import { useNav } from '@/hooks/useNav'

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

function formatTimeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const ACTION_LABELS = {
  task_created: 'Created task',
  task_updated: 'Updated task',
  task_run: 'Started task',
  task_pickup: 'Picked up task',
  task_completed: 'Completed task',
  task_deleted: 'Deleted task',
  task_status_check: 'Checked sub-agent',
  task_timeout: 'Task timed out',
}

function ActivityLog({ taskId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const params = new URLSearchParams({ limit: '50' })
    if (taskId) params.set('taskId', taskId)
    const load = () => {
      fetch(apiUrl(`api/activity?${params}`))
        .then(r => r.json())
        .then(data => { if (mounted) { setActivities(data); setLoading(false) } })
        .catch(() => { if (mounted) setLoading(false) })
    }
    load()
    return () => { mounted = false }
  }, [taskId])

  if (loading) return <div className="text-xs text-muted-foreground p-4">Loading activity...</div>
  if (!activities.length) return <div className="text-xs text-muted-foreground p-4">No activity yet</div>

  return (
    <div className="space-y-1 p-1">
      {activities.map(a => (
        <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors">
          <div className={`mt-0.5 shrink-0 rounded-full p-1 ${a.actor === 'bot' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {a.actor === 'bot' ? <Bot size={10} /> : <User size={10} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs">
              <span className={`font-medium ${a.actor === 'bot' ? 'text-purple-400' : 'text-blue-400'}`}>
                {a.actor === 'bot' ? 'Bot' : 'User'}
              </span>
              {' '}
              <span className="text-muted-foreground">{ACTION_LABELS[a.action] || a.action}</span>
              {a.details?.title && (
                <span className="text-foreground font-medium"> "{a.details.title}"</span>
              )}
              {a.details?.hasError && <span className="text-red-400"> (with error)</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">{formatTimeAgo(a.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TaskDetailDialog({ open, onClose, task }) {
  const { timezone } = useTimezone()
  const { navigate } = useNav()

  // Live elapsed time for in-progress tasks
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!open || !task || task.status !== 'in-progress' || !task.startedAt) { setElapsed(''); return }
    const tick = () => setElapsed(formatDuration(task.startedAt, new Date().toISOString()) || '')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [open, task?.id, task?.status, task?.startedAt])

  if (!open || !task) return null

  const isDone = task.status === 'done'
  const isInProgress = task.status === 'in-progress'
  const hasError = !!task.error
  const duration = formatDuration(task.startedAt || task.createdAt, task.completedAt)
  const filePaths = extractFilePaths(task.result)
  const skillsList = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border w-full max-w-4xl flex flex-col shadow-2xl rounded-xl max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isInProgress && <Loader2 size={16} className="text-amber-400 animate-spin shrink-0" />}
              {isDone && !hasError && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
              {isDone && hasError && <AlertCircle size={16} className="text-red-400 shrink-0" />}
              <h2 className="text-lg font-semibold">{task.title}</h2>
            </div>
            {skillsList.length > 0 && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {skillsList.map(sk => (
                  <span key={sk} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{sk}</span>
                ))}
              </div>
            )}
            {(task.startedAt || task.completedAt) && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5">
                <span>Started {formatTime(task.startedAt || task.createdAt, timezone)}</span>
                {duration && <span className="text-green-400 font-medium flex items-center gap-0.5"><Clock size={10} />{duration}</span>}
                {isInProgress && elapsed && <span className="text-amber-400 font-medium flex items-center gap-0.5"><Clock size={10} />{elapsed}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-3"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden min-h-[300px] flex flex-col md:flex-row">
          {/* Main content — left 2/3 */}
          <div className="w-full md:w-2/3 overflow-y-auto p-5 space-y-4">
            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</h3>
                <p className="text-sm text-foreground/90">{task.description}</p>
              </div>
            )}

            {/* Output */}
            {(task.result || task.error) && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {task.error ? 'Error Output' : 'Output'}
                </h3>
                <pre className={cn(
                  'text-xs font-mono p-3 rounded-lg max-h-64 overflow-auto whitespace-pre-wrap break-words',
                  task.error ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-secondary/50 text-foreground/80 border border-border'
                )}>
                  {task.error || task.result}
                </pre>
              </div>
            )}

            {/* Linked Files */}
            {filePaths.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Linked Files</h3>
                <div className="space-y-1">
                  {filePaths.map(fp => (
                    <button
                      key={fp}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border text-sm hover:bg-secondary hover:border-primary/30 transition-colors w-full text-left cursor-pointer"
                      onClick={() => { onClose(); navigate('files', { openFile: fp }) }}
                    >
                      <FileText size={13} className="text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs truncate">{fp}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Activity Log — right 1/3 */}
          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
            <div className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border">
              <Activity size={14} />
              History
            </div>
            <ActivityLog taskId={task.id} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
<button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-accent transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}
