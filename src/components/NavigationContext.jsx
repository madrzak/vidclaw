import React, { createContext, useContext, useState, useCallback } from 'react'

const NavigationContext = createContext(null)

export function NavigationProvider({ children }) {
  const [page, setPage] = useState('kanban')
  const [fileBrowserPath, setFileBrowserPath] = useState(null)

  const navigateToFile = useCallback((filePath) => {
    setFileBrowserPath(filePath)
    setPage('files')
  }, [])

  return (
    <NavigationContext.Provider value={{ page, setPage, fileBrowserPath, setFileBrowserPath, navigateToFile }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
