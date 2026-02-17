import React, { useState, useEffect, useRef } from 'react'
import { X, Bot, User, Activity } from 'lucide-react'

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

export default function TaskDialog({ open, onClose, onSave, task }) {
  const [form, setForm] = useState({ title: '', description: '', skills: [], status: 'backlog' })
  const [skills, setSkills] = useState([])
  const [activeTab, setActiveTab] = useState('form')

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})
  }, [])

  useEffect(() => {
    if (task) {
      const taskSkills = task.skills && task.skills.length ? task.skills : (task.skill ? [task.skill] : [])
      setForm({ title: task.title, description: task.description, skills: taskSkills, status: task.status })
    } else {
      setForm({ title: '', description: '', skills: [], status: 'backlog' })
    }
    setActiveTab('form')
  }, [task, open])

  if (!open) return null

  function handleSave() {
    if (!form.title) return
    const data = { ...form, skill: form.skills[0] || '', schedule: null }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border w-full max-w-2xl flex flex-col shadow-2xl rounded-xl max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

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
                <label className="text-xs text-muted-foreground mb-1 block">Skills</label>
                <SkillPicker
                  selectedSkills={form.skills}
                  onChange={skills => setForm(f => ({ ...f, skills }))}
                  allSkills={skills}
                />
              </div>
            </div>
          ) : (
            <ActivityLog taskId={task?.id} />
          )}
        </div>

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
