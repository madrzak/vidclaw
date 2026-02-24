import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '@/lib/api'

interface TimezoneContextValue {
  timezone: string
  setTimezone: (tz: string) => void
}

const TimezoneContext = createContext<TimezoneContextValue>({ timezone: 'UTC', setTimezone: () => {} })

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    api.settings.get()
      .then(d => { if (d.timezone) setTimezone(d.timezone) })
      .catch(() => {})
  }, [])

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone(): TimezoneContextValue {
  return useContext(TimezoneContext)
}
