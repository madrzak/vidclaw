import React, { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { Plus, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import HeartbeatTimer from '../Usage/HeartbeatTimer'

function SkillAutosuggest({ inputRef, title, setTitle, onSubmit, skills }) {
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestFilter, setSuggestFilter] = useState('')
  const [suggestIndex, setSuggestIndex] = useState(0)
  const suggestRef = useRef(null)

  // Find the @ trigger position
  function getAtInfo(text, cursorPos) {
    const before = text.slice(0, cursorPos)
    const atIdx = before.lastIndexOf('@')
    if (atIdx === -1) return null
    // Make sure there's no space between @ and cursor (allow empty query right after @)
    const query = before.slice(atIdx + 1)
    if (/\s/.test(query)) return null
    return { atIdx, query }
  }

  function getFilteredSkills() {
    const ids = skills.map(s => typeof s === 'string' ? s : s.id || s.name)
    return ids.filter(id => id.toLowerCase().includes(suggestFilter.toLowerCase())).slice(0, 10)
  }

  function insertSkill(skillId) {
    const el = inputRef.current
    if (!el) return
    const cursorPos = el.selectionStart || title.length
    const info = getAtInfo(title, cursorPos)
    if (!info) return
    const before = title.slice(0, info.atIdx)
    const after = title.slice(cursorPos)
    const newTitle = before + '@' + skillId + ' ' + after
    setTitle(newTitle)
    setShowSuggest(false)
    setSuggestFilter('')
    // Focus and set cursor after inserted skill
    setTimeout(() => {
      if (el) {
        const pos = before.length + 1 + skillId.length + 1
        el.selectionStart = el.selectionEnd = pos
        el.focus()
      }
    }, 0)
  }

  function handleChange(e) {
    const val = e.target.value
    setTitle(val)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'

    // Check for @ trigger
    const cursorPos = el.selectionStart || val.length
    const info = getAtInfo(val, cursorPos)
    if (info) {
      setSuggestFilter(info.query)
      setSuggestIndex(0)
      setShowSuggest(true)
    } else {
      setShowSuggest(false)
    }
  }

  function handleKeyDown(e) {
    if (showSuggest) {
      const filtered = getFilteredSkills()
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
        if (filtered[suggestIndex]) insertSkill(filtered[suggestIndex])
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = getFilteredSkills()

  return (
    <div className="relative" ref={suggestRef}>
      <textarea
        ref={inputRef}
        value={title}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title... (type @ for skills)"
        rows={1}
        style={{ overflow: 'hidden' }}
        className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
      />
      {showSuggest && filtered.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 w-full max-h-40 overflow-y-auto bg-card border border-border rounded-md shadow-lg">
          {filtered.map((id, i) => (
            <button
              key={id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertSkill(id) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors',
                i === suggestIndex ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
              )}
            >
              @{id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Column({ column, tasks, onAdd, onQuickAdd, onEdit, onView, onDelete, onRun, onToggleSchedule, onBulkArchive, capacity }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [skills, setSkills] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  useEffect(() => {
    fetch('api/skills').then(r => r.json()).then(setSkills).catch(() => {})
  }, [])

  const handleSubmit = () => {
    const t = title.trim()
    if (!t) return
    // Extract @skill mentions from the title
    const skillMatches = t.match(/@(\S+)/g) || []
    const mentionedSkills = skillMatches.map(m => m.slice(1))
    const cleanTitle = t.replace(/@\S+/g, '').replace(/\s+/g, ' ').trim()
    onQuickAdd?.(column.id, cleanTitle || t, mentionedSkills)
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
            <TaskCard key={task.id} task={task} onEdit={onEdit} onView={onView} onDelete={onDelete} onRun={onRun} onToggleSchedule={onToggleSchedule} />
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
            <SkillAutosuggest
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
