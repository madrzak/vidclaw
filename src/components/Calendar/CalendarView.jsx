import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, FileText, CheckCircle, Clock, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimezone } from '../TimezoneContext'
import PageSkeleton from '../PageSkeleton'

function LiveClock({ timezone }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', second: '2-digit' })
  const dayStr = now.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', month: 'short', day: 'numeric' })
  const tzAbbr = now.toLocaleTimeString('en-US', { timeZone: timezone, timeZoneName: 'short' }).split(' ').pop()
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock size={14} className="text-orange-400" />
      <span className="font-medium text-foreground">{dayStr}</span>
      <span>{timeStr}</span>
      <span className="text-xs">{tzAbbr}</span>
    </div>
  )
}

export default function CalendarView() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(() => new Date().toLocaleDateString('en-CA'))
  const { timezone } = useTimezone()

  useEffect(() => {
    fetch('/api/calendar').then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone })

  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  function dateStr(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const selectedData = selected ? data[selected] : null

  if (loading) return <PageSkeleton variant="calendar" />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-end mb-2">
        <LiveClock timezone={timezone} />
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrent(new Date(year, month - 1))} className="p-2 hover:bg-accent rounded-md transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold">
          {current.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={() => setCurrent(new Date(year, month + 1))} className="p-2 hover:bg-accent rounded-md transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const ds = dateStr(d)
          const entry = data[ds]
          const isToday = ds === today
          const isSelected = ds === selected
          return (
            <button
              key={ds}
              onClick={() => setSelected(ds)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative',
                isToday && 'ring-1 ring-primary',
                isSelected && 'bg-primary/20',
                entry && 'bg-accent',
                !entry && 'hover:bg-accent/50'
              )}
            >
              <span className={cn(isToday && 'font-bold text-primary')}>{d}</span>
              {entry && (
                <div className="flex gap-0.5">
                  {entry.memory && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                  {entry.tasks?.length > 0 && <div className="w-1 h-1 rounded-full bg-green-400" />}
                  {entry.scheduled?.length > 0 && <div className="w-1 h-1 rounded-full bg-orange-400" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Memory note</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Task completed</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Scheduled</div>
      </div>

      {selected && (() => {
        const entries = []
        if (selectedData?.memory) entries.push({ type: 'memory', text: typeof selectedData.memory === 'string' ? selectedData.memory : 'Memory note' })
        selectedData?.tasks?.forEach(t => entries.push({ type: 'task', text: t }))
        selectedData?.scheduled?.forEach(t => entries.push({ type: 'scheduled', text: t }))

        const dateLabel = new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric'
        })

        const dotColor = { memory: 'bg-blue-400', task: 'bg-green-400', scheduled: 'bg-orange-400' }
        const textColor = { memory: 'text-muted-foreground', task: 'text-muted-foreground', scheduled: 'text-orange-400' }
        const Icon = { memory: FileText, task: CheckCircle, scheduled: CalendarClock }

        return (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-medium text-sm">{dateLabel}</h3>
            {entries.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded</p>}
            {entries.length > 0 && (
              <div className="space-y-3">
                {entries.map((entry, i) => {
                  const EntryIcon = Icon[entry.type]
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', dotColor[entry.type])} />
                      <div className={cn('flex items-start gap-2 text-sm', textColor[entry.type])}>
                        <EntryIcon size={14} className={cn('shrink-0 mt-0.5', entry.type === 'task' ? 'text-green-400' : undefined)} />
                        <span>{entry.type === 'scheduled' ? `Scheduled: ${entry.text}` : entry.text}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
