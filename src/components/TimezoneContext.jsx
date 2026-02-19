import React, { createContext, useContext, useState, useEffect } from 'react'

const TimezoneContext = createContext('UTC')

export function TimezoneProvider({ children }) {
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    fetch('api/settings')
      .then(r => r.json())
      .then(d => { if (d.timezone) setTimezone(d.timezone) })
      .catch(() => {})
  }, [])

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  return useContext(TimezoneContext)
}
