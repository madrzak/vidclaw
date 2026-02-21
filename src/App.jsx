import React, { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import Board from './components/Kanban/Board'
import CalendarView from './components/Calendar/CalendarView'
import FileBrowser from './components/Content/FileBrowser'
import SkillsManager from './components/Skills/SkillsManager'
import SoulEditor from './components/Soul/SoulEditor'
import CredentialsManager from './components/Credentials/CredentialsManager'
import SettingsPage from './components/Settings/SettingsPage'
import MemoryManager from './components/Memory/MemoryManager'
import { TimezoneProvider } from './components/TimezoneContext'
import { ThemeProvider } from './components/ThemeContext'
import { SocketProvider } from './hooks/useSocket.jsx'
import { NavProvider } from './hooks/useNav.jsx'

const VALID_PAGES = new Set(['kanban', 'calendar', 'files', 'skills', 'soul', 'credentials', 'settings'])

function PageSlot({ active, children }) {
  return <div className={active ? 'contents' : 'hidden'}>{children}</div>
}

function getHashPage() {
  const hash = location.hash.replace('#', '')
  return VALID_PAGES.has(hash) ? hash : 'kanban'
}

export default function App() {
  const [page, setPageRaw] = useState(getHashPage)

  const setPage = useCallback((p) => {
    setPageRaw(p)
    history.pushState(null, '', `#${p}`)
  }, [])

  useEffect(() => {
    const onPop = () => setPageRaw(getHashPage())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <ThemeProvider>
      <SocketProvider>
        <TimezoneProvider>
          <NavProvider setPage={setPage}>
            <Layout page={page} setPage={setPage}>
              <PageSlot active={page === 'kanban'}><Board visible={page === 'kanban'} /></PageSlot>
              <PageSlot active={page === 'calendar'}><CalendarView /></PageSlot>
              <PageSlot active={page === 'files'}><FileBrowser /></PageSlot>
              <PageSlot active={page === 'skills'}><SkillsManager /></PageSlot>
              <PageSlot active={page === 'soul'}><SoulEditor /></PageSlot>
              <PageSlot active={page === 'credentials'}><CredentialsManager /></PageSlot>
              <PageSlot active={page === 'settings'}><SettingsPage /></PageSlot>
            </Layout>
          </NavProvider>
        </TimezoneProvider>
      </SocketProvider>
    </ThemeProvider>
  )
}
