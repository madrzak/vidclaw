export function deriveState(tasks, celebratingRef) {
  const inProgress = tasks.filter(t => t.status === 'in-progress')
  const done = tasks.filter(t => t.status === 'done')

  const doneIds = new Set(done.map(t => t.id || t._id))
  const prevDoneIds = celebratingRef.current.seenDoneIds
  const hasNewDone = [...doneIds].some(id => !prevDoneIds.has(id))

  if (hasNewDone) {
    celebratingRef.current.seenDoneIds = doneIds
    celebratingRef.current.celebrateUntil = Date.now() + 30000
  } else {
    celebratingRef.current.seenDoneIds = doneIds
  }

  if (Date.now() < celebratingRef.current.celebrateUntil) return 'celebrating'
  if (inProgress.length > 0) return 'working'
  return 'idle'
}
