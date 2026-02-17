import React from 'react'
import Layout from './components/Layout'
import Board from './components/Kanban/Board'
import CalendarView from './components/Calendar/CalendarView'
import FileBrowser from './components/Content/FileBrowser'
import SkillsManager from './components/Skills/SkillsManager'
import SoulEditor from './components/Soul/SoulEditor'
import SettingsPage from './components/Settings/SettingsPage'
import { TimezoneProvider } from './components/TimezoneContext'
import { SocketProvider } from './hooks/useSocket.jsx'
import { NavigationProvider, useNavigation } from './components/NavigationContext'

function AppContent() {
  const { page, setPage } = useNavigation()

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'kanban' && <Board />}
      {page === 'calendar' && <CalendarView />}
      {page === 'files' && <FileBrowser />}
      {page === 'skills' && <SkillsManager />}
      {page === 'soul' && <SoulEditor />}
      {page === 'settings' && <SettingsPage />}
    </Layout>
  )
}

export default function App() {
  return (
    <SocketProvider>
      <TimezoneProvider>
        <NavigationProvider>
          <AppContent />
        </NavigationProvider>
      </TimezoneProvider>
    </SocketProvider>
  )
}
