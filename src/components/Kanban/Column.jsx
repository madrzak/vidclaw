import React, { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { Plus, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import HeartbeatTimer from '../Usage/HeartbeatTimer'

const SCHEDULE_OPTIONS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: '2d', label: 'Every 2 days' },
  { id: '3d', label: 'Every 3 days' },
  { id: '1h', label: 'Every hour' },
  { id: '2h', label: 'Every 2 hours' },
  { id: '6h', label: 'Every 6 hours' },
  { id: '12h', label: 'Every 12 hours' },
  { id: '2w', label: 'Every 2 weeks' },
]

function QuickAddInput({ inputRef, title, setTitle, onSubmit, skills }) {
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestFilter, setSuggestFilter] = useState('')
  const [suggestIndex, setSuggestIndex] = useState(0)
  const [suggestType, setSuggestType] = useState('skill') // 'skill' or 'schedule'
  const suggestRef = useRef(null)

  // Find trigger position for a given character (@ or /)
  function getTriggerInfo(text, cursorPos, char) {
    const before = text.slice(0, cursorPos)
    const idx = before.lastIndexOf(char)
    if (idx === -1) return null
    const query = before.slice(idx + 1)
    if (/\s/.test(query)) return null
    return { idx, query }
  }

  function getFilteredItems() {
    if (suggestType === 'schedule') {
      return SCHEDULE_OPTIONS.filter(o => o.id.toLowerCase().includes(suggestFilter.toLowerCase()))
    }
    const ids = skills.map(s => typeof s === 'string' ? s : s.id || s.name)
    return ids.filter(id => id.toLowerCase().includes(suggestFilter.toLowerCase())).slice(0, 10).map(id => ({ id, label: id }))
  }

  function insertItem(item) {
    const el = inputRef.current
    if (!el) return
    const cursorPos = el.selectionStart || title.length
    const char = suggestType === 'schedule' ? '/' : '@'
    const info = getTriggerInfo(title, cursorPos, char)
    if (!info) return
    const before = title.slice(0, info.idx)
    const after = title.slice(cursorPos)
    const newTitle = before + char + item.id + ' ' + after
    setTitle(newTitle)
    setShowSuggest(false)
    setSuggestFilter('')
    setTimeout(() => {
      if (el) {
        const pos = before.length + 1 + item.id.length + 1
        el.selectionStart = el.selectionEnd = pos
        el.focus()
      }
    }, 0)
  }

  function handleChange(e) {
    const val = e.target.value
    setTitle(val)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'

    const cursorPos = el.selectionStart || val.length
    // Check / trigger first, then @
    const slashInfo = getTriggerInfo(val, cursorPos, '/')
    const atInfo = getTriggerInfo(val, cursorPos, '@')

    if (slashInfo && (!atInfo || slashInfo.idx > atInfo.idx)) {
      setSuggestType('schedule')
      setSuggestFilter(slashInfo.query)
      setSuggestIndex(0)
      setShowSuggest(true)
    } else if (atInfo) {
      setSuggestType('skill')
      setSuggestFilter(atInfo.query)
      setSuggestIndex(0)
      setShowSuggest(true)
    } else {
      setShowSuggest(false)
    }
  }

  function handleKeyDown(e) {
    if (showSuggest) {
      const filtered = getFilteredItems()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestIndex(i => Math.min(i + 1, filtered.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && filtered.length > 0)) {
        e.preventDefault()
        if (filtered[suggestIndex]) insertItem(filtered[suggestIndex])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggest(false)
        return
      }
    }
    if (e.key === 'Enter' && !showSuggest) { e.preventDefault(); onSubmit() }
    if (e.key === 'Escape' && !showSuggest) { setTitle(''); }
  }

  useEffect(() => {
    function handleClick(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = getFilteredItems()

  return (
    <div className="relative" ref={suggestRef}>
      <textarea
        ref={inputRef}
        value={title}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Task... (@ skills, / schedule)"
        rows={1}
        style={{ overflow: 'hidden' }}
        className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
      />
      {showSuggest && filtered.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 w-full max-h-40 overflow-y-auto bg-card border border-border rounded-md shadow-lg">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertItem(item) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                i === suggestIndex ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
            >
              <span className="text-muted-foreground">{suggestType === 'schedule' ? '/' : '@'}</span>{item.id}
              {suggestType === 'schedule' && item.label !== item.id && (
                <span className="text-muted-foreground/60 ml-2">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Column({ column, tasks, onAdd, onQuickAdd, onEdit, onView, onDelete, onRun, onToggleSchedule, onBulkArchive, capacity, channels = [] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [skills, setSkills] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  useEffect(() => {
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})
  }, [])

  const handleSubmit = () => {
    const t = title.trim()
    if (!t) return
    // Extract @skill mentions from the title
    const skillMatches = t.match(/@(\S+)/g) || []
    const mentionedSkills = skillMatches.map(m => m.slice(1))
    // Extract /schedule shorthand from the title
    const scheduleMatch = t.match(/\/(\S+)/)
    let schedule = null
    if (scheduleMatch) {
      const s = scheduleMatch[1].toLowerCase()
      if (['daily', 'weekly', 'monthly'].includes(s)) schedule = s
      else {
        const m = s.match(/^(\d+)(h|d|w|m)$/)
        if (m) {
          const n = parseInt(m[1]), u = m[2]
          if (u === 'h') schedule = n === 1 ? '0 * * * *' : `0 */${n} * * *`
          else if (u === 'd') schedule = n === 1 ? '0 9 * * *' : `0 9 */${n} * *`
          else if (u === 'w') schedule = `0 9 */${n * 7} * *`
          else if (u === 'm') schedule = n === 1 ? '0 9 1 * *' : `0 9 1 */${n} *`
        }
      }
    }
    const cleanTitle = t.replace(/@\S+/g, '').replace(/\/\S+/g, '').replace(/\s+/g, ' ').trim()
    onQuickAdd?.(column.id, cleanTitle || t, mentionedSkills, schedule)
    setTitle('')
  }

  const taskIds = tasks.map(t => t.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[240px] sm:min-w-[260px] max-w-[320px] flex flex-col rounded-xl bg-card/50 border border-border transition-colors',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border relative overflow-visible">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', column.color)} />
          <span className="text-sm font-medium">{column.title}</span>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-1.5">{tasks.length}</span>
          {capacity && capacity.maxConcurrent > 1 && (
            <div className="flex items-center gap-1 ml-1.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: capacity.maxConcurrent }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      i < capacity.activeCount ? 'bg-amber-400' : 'bg-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{capacity.activeCount}/{capacity.maxConcurrent}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {column.id === 'done' && tasks.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Archive all ${tasks.length} completed task(s)?`)) {
                  onBulkArchive?.('done')
                }
              }}
              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
              title="Clear all completed tasks"
            >
              <Trash2 size={14} />
            </button>
          )}
          {column.id === 'todo' && <HeartbeatTimer />}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onView={onView} onDelete={onDelete} onRun={onRun} onToggleSchedule={onToggleSchedule} channels={channels} />
          ))}
        </SortableContext>
      </div>

      {(column.id === 'backlog' || column.id === 'todo') && <div className="p-2 border-t border-border/50">
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary/50"
          >
            <Plus size={14} />
            <span>Add a card</span>
          </button>
        ) : (
          <div className="space-y-2">
            <QuickAddInput
              inputRef={inputRef}
              title={title}
              setTitle={setTitle}
              onSubmit={handleSubmit}
              skills={skills}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add card
              </button>
              <button
                onClick={() => { setAdding(false); setTitle('') }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>}
    </div>
  )
}
