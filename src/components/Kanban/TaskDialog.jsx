import React, { useState, useEffect, useRef } from 'react'
import { X, Bot, User, Activity, FileText, FolderOpen } from 'lucide-react'
import { extractFilePaths } from './TaskCard'
// NavigationContext removed — not yet implemented

function formatTime(iso) {
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
}

function ActivityLog({ taskId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const params = new URLSearchParams({ limit: '50' })
    if (taskId) params.set('taskId', taskId)
    const load = () => {
      fetch(`/api/activity?${params}`)
        .then(r => r.json())
        .then(data => { if (mounted) { setActivities(data); setLoading(false) } })
        .catch(() => { if (mounted) setLoading(false) })
    }
    load()
    const interval = setInterval(load, 10000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

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
            <p className="text-[10px] text-muted-foreground">{formatTime(a.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkillPicker({ selectedSkills, onChange, allSkills }) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = allSkills.filter(s => {
    const id = typeof s === 'string' ? s : s.id || s.name
    return !selectedSkills.includes(id) && id.toLowerCase().includes(query.toLowerCase())
  })

  function addSkill(skillId) {
    onChange([...selectedSkills, skillId])
    setQuery('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  function removeSkill(skillId) {
    onChange(selectedSkills.filter(s => s !== skillId))
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 bg-secondary border border-border rounded-md px-2 py-1.5 min-h-[36px] items-center cursor-text" onClick={() => inputRef.current?.focus()}>
        {selectedSkills.map(sk => (
          <span key={sk} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            {sk}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeSkill(sk) }} className="hover:text-orange-200">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !query && selectedSkills.length) {
              removeSkill(selectedSkills[selectedSkills.length - 1])
            }
            if (e.key === 'Escape') setShowDropdown(false)
            if (e.key === 'Enter' && filtered.length > 0) {
              e.preventDefault()
              const id = typeof filtered[0] === 'string' ? filtered[0] : filtered[0].id || filtered[0].name
              addSkill(id)
            }
          }}
          placeholder={selectedSkills.length ? '' : 'Search skills...'}
        />
      </div>
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-card border border-border rounded-md shadow-lg">
          {filtered.slice(0, 20).map(s => {
            const id = typeof s === 'string' ? s : s.id || s.name
            const label = typeof s === 'string' ? s : s.name || s.id
            return (
              <button
                key={id}
                type="button"
                onClick={() => addSkill(id)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/80 transition-colors text-foreground"
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function parseSchedule(s) {
  const defaults = { mode: 'none', interval: 1, period: 'days', time: '09:00', cron: '' }
  if (!s) return defaults
  if (s === 'daily') return { ...defaults, mode: 'interval', interval: 1, period: 'days', time: '00:00' }
  if (s === 'weekly') return { ...defaults, mode: 'interval', interval: 1, period: 'weeks', time: '00:00' }
  if (s === 'monthly') return { ...defaults, mode: 'interval', interval: 1, period: 'months', time: '00:00' }

  const parts = s.trim().split(/\s+/)
  if (parts.length === 5) {
    const [min, hour, dom, mon, dow] = parts
    const m = parseInt(min), h = parseInt(hour)
    const pad = n => String(n).padStart(2, '0')

    if (!isNaN(m) && dom === '*' && mon === '*' && dow === '*') {
      if (hour === '*') return { ...defaults, mode: 'interval', interval: 1, period: 'hours' }
      if (hour.startsWith('*/')) return { ...defaults, mode: 'interval', interval: parseInt(hour.slice(2)) || 1, period: 'hours' }
    }

    if (!isNaN(m) && !isNaN(h)) {
      const t = `${pad(h)}:${pad(m)}`
      if (dom === '1' && mon.startsWith('*/') && dow === '*')
        return { ...defaults, mode: 'interval', interval: parseInt(mon.slice(2)) || 1, period: 'months', time: t }
      if (dom === '1' && mon === '*' && dow === '*')
        return { ...defaults, mode: 'interval', interval: 1, period: 'months', time: t }
      if (dom.startsWith('*/') && mon === '*' && dow === '*') {
        const n = parseInt(dom.slice(2)) || 1
        if (n % 7 === 0) return { ...defaults, mode: 'interval', interval: n / 7, period: 'weeks', time: t }
        return { ...defaults, mode: 'interval', interval: n, period: 'days', time: t }
      }
      if (dom === '*' && mon === '*' && dow === '*')
        return { ...defaults, mode: 'interval', interval: 1, period: 'days', time: t }
    }
  }

  return { ...defaults, mode: 'cron', cron: s }
}

function buildScheduleString({ scheduleInterval, schedulePeriod, scheduleTime }) {
  const [hh, mm] = (scheduleTime || '09:00').split(':').map(s => parseInt(s) || 0)
  const n = Math.max(1, parseInt(scheduleInterval) || 1)

  switch (schedulePeriod) {
    case 'hours': return n === 1 ? '0 * * * *' : `0 */${n} * * *`
    case 'days': return n === 1 ? `${mm} ${hh} * * *` : `${mm} ${hh} */${n} * *`
    case 'weeks': return `${mm} ${hh} */${n * 7} * *`
    case 'months': return n === 1 ? `${mm} ${hh} 1 * *` : `${mm} ${hh} 1 */${n} *`
    default: return ''
  }
}

export default function TaskDialog({ open, onClose, onSave, onDelete, task }) {
  const [form, setForm] = useState({ title: '', description: '', skills: [], status: 'backlog', channel: null, scheduleMode: 'none', scheduleInterval: 1, schedulePeriod: 'days', scheduleTime: '09:00', scheduleCron: '' })
  const [skills, setSkills] = useState([])
  const [channels, setChannels] = useState([])

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})
    fetch('/api/channels').then(r => r.json()).then(setChannels).catch(() => {})
  }, [])

  useEffect(() => {
    if (task) {
      const taskSkills = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])
      const sched = parseSchedule(task.schedule)
      setForm({ title: task.title, description: task.description, skills: taskSkills, status: task.status, channel: task.channel || null, scheduleMode: sched.mode, scheduleInterval: sched.interval, schedulePeriod: sched.period, scheduleTime: sched.time, scheduleCron: sched.cron })
    } else {
      setForm({ title: '', description: '', skills: [], status: 'backlog', channel: null, scheduleMode: 'none', scheduleInterval: 1, schedulePeriod: 'days', scheduleTime: '09:00', scheduleCron: '' })
    }
  }, [task, open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  function handleSave() {
    if (!form.title) return
    const schedule = form.scheduleMode === 'cron' ? form.scheduleCron
      : form.scheduleMode === 'interval' ? buildScheduleString(form)
      : null
    const { scheduleMode, scheduleInterval, schedulePeriod, scheduleTime, scheduleCron, ...rest } = form
    const data = { ...rest, skill: rest.skills[0] || '', schedule, channel: rest.channel || null }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border w-full max-w-4xl flex flex-col shadow-2xl rounded-xl max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-hidden min-h-[320px] flex flex-col md:flex-row">
          {/* Form — left 2/3 */}
          <div className="w-full md:w-2/3 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <input
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title..."
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <textarea
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none h-28"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description..."
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {channels && channels.length > 1 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Channel <span className="text-muted-foreground/60">(optional - execute in specific context)</span>
                </label>
                <select
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                  value={form.channel || ''}
                  onChange={e => setForm(f => ({ ...f, channel: e.target.value || null }))}
                >
                  {channels.map(ch => (
                    <option key={ch.id || 'main'} value={ch.id || ''}>
                      {ch.icon ? `${ch.icon} ` : ''}{ch.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Run this task in a specific channel context (e.g., Telegram topic, Discord thread) to use that conversation's memory and history.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Schedule</label>
              <select
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                value={form.scheduleMode === 'cron' ? 'cron' : form.scheduleMode}
                onChange={e => {
                  const mode = e.target.value
                  if (mode === 'none') setForm(f => ({ ...f, scheduleMode: 'none' }))
                  else setForm(f => ({ ...f, scheduleMode: 'interval' }))
                }}
              >
                <option value="none">None</option>
                <option value="interval">Repeat...</option>
                {form.scheduleMode === 'cron' && <option value="cron">Custom (cron)</option>}
              </select>

              {form.scheduleMode === 'interval' && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <input
                    type="number"
                    min="1"
                    className="w-16 bg-secondary border border-border rounded-md px-2 py-1.5 text-sm outline-none text-center"
                    value={form.scheduleInterval}
                    onChange={e => setForm(f => ({ ...f, scheduleInterval: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                  <select
                    className="bg-secondary border border-border rounded-md px-2 py-1.5 text-sm outline-none"
                    value={form.schedulePeriod}
                    onChange={e => setForm(f => ({ ...f, schedulePeriod: e.target.value }))}
                  >
                    <option value="hours">hour(s)</option>
                    <option value="days">day(s)</option>
                    <option value="weeks">week(s)</option>
                    <option value="months">month(s)</option>
                  </select>
                  {form.schedulePeriod !== 'hours' && (
                    <>
                      <span className="text-xs text-muted-foreground">at</span>
                      <input
                        type="time"
                        className="bg-secondary border border-border rounded-md px-2 py-1.5 text-sm outline-none [color-scheme:dark]"
                        value={form.scheduleTime}
                        onChange={e => setForm(f => ({ ...f, scheduleTime: e.target.value }))}
                      />
                    </>
                  )}
                </div>
              )}

              {form.scheduleMode === 'cron' && (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Cron: <code className="bg-secondary/80 px-1.5 py-0.5 rounded text-foreground">{form.scheduleCron}</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, scheduleMode: 'interval', scheduleCron: '' }))}
                    className="text-xs text-primary hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
              <SkillPicker
                selectedSkills={form.skills}
                onChange={skills => setForm(f => ({ ...f, skills }))}
                allSkills={skills}
              />
            </div>
          </div>

          {/* Activity Log — right 1/3 */}
          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-border overflow-y-auto">
            <div className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border">
              <Activity size={14} />
              Activity Log
            </div>
            <ActivityLog taskId={task?.id} />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          {task && onDelete ? (
            <button
              onClick={() => { if (window.confirm('Delete this task?')) { onDelete(task.id); onClose() } }}
              className="px-3 py-2 text-sm rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-accent transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
          >
            {task ? 'Update' : 'Create'}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
