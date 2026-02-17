import React, { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import HeartbeatTimer from '../Usage/HeartbeatTimer'

export default function Column({ column, tasks, onAdd, onQuickAdd, onEdit, onDelete, onRun }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  const handleSubmit = () => {
    const t = title.trim()
    if (!t) return
    onQuickAdd?.(column.id, t)
    setTitle('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    if (e.key === 'Escape') { setAdding(false); setTitle('') }
  }

  const taskIds = tasks.map(t => t.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 min-w-[260px] max-w-[320px] flex flex-col rounded-xl bg-card/50 border border-border transition-colors',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border relative overflow-visible">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', column.color)} />
          <span className="text-sm font-medium">{column.title}</span>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-1.5">{tasks.length}</span>
        </div>
        {column.id === 'todo' && <HeartbeatTimer />}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onRun={onRun} />
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
            <textarea
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a title..."
              rows={2}
              className="w-full bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25"
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
