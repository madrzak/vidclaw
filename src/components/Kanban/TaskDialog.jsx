import React, { useState, useEffect } from 'react'
import { X, Clock, Bot, User, Activity } from 'lucide-react'

function getDefaultScheduleTime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

function ActivityLog() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = () => {
      fetch('/api/activity?limit=50')
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

export default function TaskDialog({ open, onClose, onSave, task }) {
  const [form, setForm] = useState({ title: '', description: '', skill: '', status: 'backlog', schedule: null })
  const [scheduleType, setScheduleType] = useState('none')
  const [scheduleTime, setScheduleTime] = useState(getDefaultScheduleTime())
  const [skills, setSkills] = useState([])
  const [activeTab, setActiveTab] = useState('form')

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})
  }, [])

  useEffect(() => {
    if (task) {
      setForm({ title: task.title, description: task.description, skill: task.skill || '', status: task.status, schedule: task.schedule || null })
      if (!task.schedule) { setScheduleType('none') }
      else if (task.schedule === 'asap') { setScheduleType('asap') }
      else if (task.schedule === 'next-heartbeat') { setScheduleType('next-heartbeat') }
      else { setScheduleType('specific'); setScheduleTime(task.schedule.slice(0, 16)) }
    } else {
      setForm({ title: '', description: '', skill: '', status: 'backlog', schedule: null })
      setScheduleType('none')
      setScheduleTime(getDefaultScheduleTime())
    }
    setActiveTab('form')
  }, [task, open])

  if (!open) return null

  function handleSave() {
    if (!form.title) return
    let schedule = null
    if (scheduleType === 'asap') schedule = 'asap'
    else if (scheduleType === 'next-heartbeat') schedule = 'next-heartbeat'
    else if (scheduleType === 'specific') schedule = new Date(scheduleTime).toISOString()
    const data = { ...form, schedule }
    if (schedule) data.scheduledAt = new Date().toISOString()
    onSave(data)
  }

  const scheduleOptions = [
    { value: 'none', label: 'No Schedule' },
    { value: 'asap', label: 'ASAP' },
    { value: 'next-heartbeat', label: 'Next Heartbeat' },
    { value: 'specific', label: 'Specific Time' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      {/* Desktop: right side panel, Mobile: bottom sheet */}
      <div
        className="bg-card border-l border-border w-full max-w-2xl flex flex-col shadow-2xl
          max-sm:border-l-0 max-sm:border-t max-sm:mt-auto max-sm:max-h-[85vh] max-sm:rounded-t-xl
          sm:h-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'form' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {task ? 'Edit' : 'Create'}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'activity' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Activity size={14} /> Activity Log
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'form' ? (
            <div className="p-5 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Skill</label>
                  <select
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none"
                    value={form.skill}
                    onChange={e => setForm(f => ({ ...f, skill: e.target.value }))}
                  >
                    <option value="">None</option>
                    {skills.map(s => {
                      const id = typeof s === 'string' ? s : s.id || s.name
                      const label = typeof s === 'string' ? s : s.name || s.id
                      return <option key={id} value={id}>{label}</option>
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Clock size={12} className="text-orange-500" /> Schedule
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {scheduleOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setScheduleType(opt.value)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        scheduleType === opt.value
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                          : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {scheduleType === 'specific' && (
                  <input
                    type="datetime-local"
                    className="mt-2 w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-500"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                  />
                )}
              </div>
            </div>
          ) : (
            <ActivityLog />
          )}
        </div>

        {/* Footer */}
        {activeTab === 'form' && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-accent transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
            >
              {task ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
