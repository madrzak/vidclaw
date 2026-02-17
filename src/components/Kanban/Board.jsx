import React, { useState, useEffect, useCallback } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, pointerWithin, rectIntersection } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Column from './Column'
import TaskCard from './TaskCard'
import TaskDialog from './TaskDialog'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-zinc-500' },
  { id: 'todo', title: 'Todo', color: 'bg-blue-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
]

export default function Board() {
  const [tasks, setTasks] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTask, setEditTask] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Custom collision detection: prefer pointerWithin (accurate to cursor position), fall back to rectIntersection
  const collisionDetection = useCallback((args) => {
    const pw = pointerWithin(args)
    if (pw.length > 0) return pw
    return rectIntersection(args)
  }, [])

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    setTasks(await res.json())
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => {
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const activeTask = tasks.find(t => t.id === activeId)

  function getColumnTasks(columnId) {
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

  function findColumn(taskId) {
    const task = tasks.find(t => t.id === taskId)
    return task?.status || null
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeTaskObj = tasks.find(t => t.id === active.id)
    if (!activeTaskObj) return

    // Determine target column: over could be a column or another task
    const isColumn = COLUMNS.find(c => c.id === over.id)
    let targetColumn, overTaskId
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
      // Reorder within column
      const columnTasks = getColumnTasks(sourceColumn)
      const oldIndex = columnTasks.findIndex(t => t.id === active.id)
      const newIndex = overTaskId ? columnTasks.findIndex(t => t.id === overTaskId) : columnTasks.length - 1
      if (oldIndex === newIndex) return

      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      const orderMap = {}
      reordered.forEach((t, i) => { orderMap[t.id] = i })

      // Optimistic update
      setTasks(prev => prev.map(t => orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t))

      try {
        await fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: sourceColumn, order: reordered.map(t => t.id) }),
        })
      } catch {
        fetchTasks()
      }
    } else {
      // Move to different column — calculate insertion order
      const targetTasks = getColumnTasks(targetColumn)
      let newOrder
      if (overTaskId) {
        const overIndex = targetTasks.findIndex(t => t.id === overTaskId)
        const overTask = targetTasks[overIndex]
        newOrder = (overTask?.order ?? overIndex) + 1
        // Shift tasks at or after the insertion point
        setTasks(prev => prev.map(t => {
          if (t.id === active.id) return { ...t, status: targetColumn, order: newOrder }
          if (t.status === targetColumn && (t.order ?? 999999) >= newOrder) return { ...t, order: (t.order ?? 999999) + 1 }
          return t
        }))
      } else {
        // Dropped on empty column area — append at end
        newOrder = targetTasks.length
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetColumn, order: newOrder } : t))
      }
      try {
        await fetch(`/api/tasks/${active.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetColumn, order: newOrder }),
        })
        // Reorder entire target column to clean up
        const updatedTargetTasks = [...targetTasks.filter(t => t.id !== active.id)]
        const insertAt = overTaskId ? updatedTargetTasks.findIndex(t => t.id === overTaskId) + 1 : updatedTargetTasks.length
        updatedTargetTasks.splice(insertAt, 0, { id: active.id })
        await fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetColumn, order: updatedTargetTasks.map(t => t.id) }),
        })
        fetchTasks()
      } catch {
        fetchTasks()
      }
    }
  }

  async function handleSave(data) {
    if (editTask) {
      await fetch(`/api/tasks/${editTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setDialogOpen(false)
    setEditTask(null)
    fetchTasks()
  }

  async function handleDelete(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  async function handleRun(id) {
    await fetch(`/api/tasks/${id}/run`, { method: 'POST' })
    fetchTasks()
  }

  async function handleQuickAdd(status, title) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status }),
    })
    fetchTasks()
  }

  function openNew(status) {
    setEditTask(null)
    setDialogOpen(true)
  }

  function openEdit(task) {
    setEditTask(task)
    setDialogOpen(true)
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={e => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-full overflow-x-auto pb-2">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onAdd={() => openNew(col.id)}
              onQuickAdd={handleQuickAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              onRun={handleRun}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTask(null) }}
        onSave={handleSave}
        task={editTask}
      />
    </>
  )
}
