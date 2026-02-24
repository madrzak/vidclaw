import React, { useState, useEffect, useCallback } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, rectIntersection, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import Column from './Column'
import TaskCard from './TaskCard'
import TaskDialog from './TaskDialog'
import TaskDetailDialog from './TaskDetailDialog'
import PageSkeleton from '../PageSkeleton'
import PixelBotView from '../PixelBot'
import { useTasks, useTaskCapacity } from '@/hooks/queries/useTasks'
import { api } from '@/lib/api'
import type { Task, Capacity, CreateTaskRequest, UpdateTaskRequest } from '@/types/api'

interface ColumnDef {
  id: string
  title: string
  color: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-zinc-500' },
  { id: 'todo', title: 'Todo', color: 'bg-blue-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

interface BoardProps {
  visible?: boolean
}

export default function Board({ visible = true }: BoardProps) {
  const queryClient = useQueryClient()
  const tasksQuery = useTasks()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<string>('backlog')
  const [viewTask, setViewTask] = useState<Task | null>(null)
  const { data: capacity = { maxConcurrent: 1, activeCount: 0, remainingSlots: 1 } } = useTaskCapacity()
  const [view, setView] = useState<'kanban' | 'pixelbot'>('kanban')

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data)
      setLoading(false)
    }
  }, [tasksQuery.data])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const collisionDetection = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
    const pw = pointerWithin(args)
    if (pw.length > 0) return pw
    return rectIntersection(args)
  }, [])

  const invalidateTasks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }, [queryClient])

  const activeTask = tasks.find(t => t.id === activeId)

  function getColumnTasks(columnId: string): Task[] {
    const filtered = tasks.filter(t => t.status === columnId)
    if (columnId === 'done') {
      return filtered.sort((a, b) => {
        const da = a.completedAt || a.updatedAt || a.createdAt || ''
        const db = b.completedAt || b.updatedAt || b.createdAt || ''
        return db.localeCompare(da)
      })
    }
    return filtered.sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999))
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event as { active: { id: string }; over: { id: string } | null }
    setActiveId(null)
    if (!over) return

    const activeTaskObj = tasks.find(t => t.id === active.id)
    if (!activeTaskObj) return

    const isColumn = COLUMNS.find(c => c.id === over.id)
    let targetColumn: string, overTaskId: string | null
    if (isColumn) {
      targetColumn = over.id
      overTaskId = null
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      if (!overTask) return
      targetColumn = overTask.status
      overTaskId = over.id
    }

    const sourceColumn = activeTaskObj.status

    if (sourceColumn === targetColumn) {
      const columnTasks = getColumnTasks(sourceColumn)
      const oldIndex = columnTasks.findIndex(t => t.id === active.id)
      const newIndex = overTaskId ? columnTasks.findIndex(t => t.id === overTaskId) : columnTasks.length - 1
      if (oldIndex === newIndex) return

      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      const orderMap: Record<string, number> = {}
      reordered.forEach((t, i) => { orderMap[t.id] = i })

      setTasks(prev => prev.map(t => orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t))

      try {
        await api.tasks.reorder(sourceColumn, reordered.map(t => t.id))
      } catch {
        invalidateTasks()
      }
    } else {
      const targetTasks = getColumnTasks(targetColumn)
      let newOrder: number
      if (overTaskId) {
        const overIndex = targetTasks.findIndex(t => t.id === overTaskId)
        const overTask = targetTasks[overIndex]
        newOrder = (overTask?.order ?? overIndex) + 1
        setTasks(prev => prev.map(t => {
          if (t.id === active.id) return { ...t, status: targetColumn as Task['status'], order: newOrder }
          if (t.status === targetColumn && (t.order ?? 999999) >= newOrder) return { ...t, order: (t.order ?? 999999) + 1 }
          return t
        }))
      } else {
        newOrder = targetTasks.length
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetColumn as Task['status'], order: newOrder } : t))
      }
      try {
        await api.tasks.update(active.id, { status: targetColumn, order: newOrder })
        const updatedTargetTasks = [...targetTasks.filter(t => t.id !== active.id)]
        const insertAt = overTaskId ? updatedTargetTasks.findIndex(t => t.id === overTaskId) + 1 : updatedTargetTasks.length
        updatedTargetTasks.splice(insertAt, 0, { id: active.id } as Task)
        await api.tasks.reorder(targetColumn, updatedTargetTasks.map(t => t.id))
        invalidateTasks()
      } catch {
        invalidateTasks()
      }
    }
  }

  async function handleSave(data: CreateTaskRequest | UpdateTaskRequest): Promise<void> {
    if (editTask) {
      await api.tasks.update(editTask.id, data as UpdateTaskRequest)
    } else {
      await api.tasks.create(data as CreateTaskRequest)
    }
    setDialogOpen(false)
    setEditTask(null)
    invalidateTasks()
  }

  async function handleDelete(id: string): Promise<void> {
    await api.tasks.delete(id)
    invalidateTasks()
  }

  async function handleRun(id: string): Promise<void> {
    await api.tasks.run(id)
    invalidateTasks()
  }

  async function handleToggleSchedule(id: string, enabled: boolean): Promise<void> {
    await api.tasks.scheduleToggle(id, enabled)
    invalidateTasks()
  }

  async function handleBulkArchive(status: string): Promise<void> {
    await api.tasks.bulkDelete({ status })
    invalidateTasks()
  }

  async function handleQuickAdd(status: string, title: string, skills: string[] = [], schedule: string | null = null): Promise<void> {
    await api.tasks.create({ title, status: status as Exclude<Task['status'], 'archived'>, skills, skill: skills[0] || '', schedule })
    invalidateTasks()
  }

  function openNew(status: string): void {
    setEditTask(null)
    setNewTaskStatus(status || 'backlog')
    setDialogOpen(true)
  }

  function openEdit(task: Task): void {
    setEditTask(task)
    setDialogOpen(true)
  }

  function openView(task: Task): void {
    setViewTask(task)
  }

  if (loading) return <PageSkeleton variant="kanban" />

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 mb-3 bg-card rounded-lg p-1 self-start border border-border">
        <button
          onClick={() => setView('kanban')}
          aria-pressed={view === 'kanban'}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'kanban' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📋 Kanban
        </button>
        <button
          onClick={() => setView('pixelbot')}
          aria-pressed={view === 'pixelbot'}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === 'pixelbot' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🤖 Pixel Bot
        </button>
      </div>

      <div className={`flex-1 min-h-0 ${view === 'pixelbot' ? '' : 'hidden'}`}>
        <PixelBotView onAddTask={() => openNew('todo')} visible={visible && view === 'pixelbot'} />
      </div>
      <div className={`flex-1 min-h-0 ${view === 'kanban' ? '' : 'hidden'}`}>
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full overflow-x-auto pb-2">
            {COLUMNS.map(col => (
              <Column
                key={col.id}
                column={col}
                tasks={getColumnTasks(col.id)}
                onAdd={() => openNew(col.id)}
                onQuickAdd={handleQuickAdd}
                onEdit={openEdit}
                onView={openView}
                onDelete={handleDelete}
                onRun={handleRun}
                onToggleSchedule={handleToggleSchedule}
                onBulkArchive={handleBulkArchive}
                capacity={col.id === 'in-progress' ? capacity : undefined}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
          </DragOverlay>
        </DndContext>
        <TaskDetailDialog
          open={!!viewTask}
          onClose={() => setViewTask(null)}
          task={viewTask}
        />
      </div>
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTask(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
        task={editTask}
        defaultStatus={newTaskStatus}
      />
    </div>
  )
}
