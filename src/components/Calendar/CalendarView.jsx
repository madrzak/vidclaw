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
  const [selected, setSelected] = useState(null)
  const { timezone } = useTimezone()

  useEffect(() => {
    fetch('api/calendar').then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
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

      {selected && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="font-medium text-sm">{selected}</h3>
          {!selectedData && <p className="text-xs text-muted-foreground">No activity recorded</p>}
          {selectedData?.memory && (
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <FileText size={12} /> Memory note exists
            </div>
          )}
          {selectedData?.scheduled?.map((t, i) => (
            <div key={`s${i}`} className="flex items-center gap-2 text-xs text-orange-400 border border-dashed border-orange-400/40 rounded px-2 py-1">
              <CalendarClock size={12} /> {t}
            </div>
          ))}
          {selectedData?.tasks?.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-green-400 border border-solid border-green-400/30 rounded px-2 py-1">
              <CheckCircle size={12} /> {t}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Memory note</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" /> Task completed</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /> Scheduled</div>
      </div>
    </div>
  )
}
