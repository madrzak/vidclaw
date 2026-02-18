import React, { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
import Layout from './components/Layout'
import Board from './components/Kanban/Board'
import CalendarView from './components/Calendar/CalendarView'
import FileBrowser from './components/Content/FileBrowser'
import SkillsManager from './components/Skills/SkillsManager'
import SoulEditor from './components/Soul/SoulEditor'
import SettingsPage from './components/Settings/SettingsPage'
import Terminals from './components/Terminals/Terminals'
import { TimezoneProvider } from './components/TimezoneContext'
import { SocketProvider } from './hooks/useSocket.jsx'

const pages = {
  kanban: Board,
  calendar: CalendarView,
  files: FileBrowser,
  skills: SkillsManager,
  soul: SoulEditor,
  settings: SettingsPage,
}

export default function App() {
  const [page, setPage] = useState('kanban')
  const mainRef = useRef(null)

  const handlePageChange = useCallback((newPage) => {
    if (newPage === page) return
    const el = mainRef.current
    if (!el) { setPage(newPage); return }

    gsap.to(el, {
      opacity: 0,
      y: 8,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        setPage(newPage)
        gsap.fromTo(el,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        )
      }
    })
  }, [page])

  const PageComponent = pages[page]

  return (
    <SocketProvider>
      <TimezoneProvider>
        <Layout page={page} setPage={handlePageChange}>
          <div ref={mainRef}>
            {PageComponent && page !== 'terminals' && <PageComponent />}
          </div>

          {/* Terminals stay mounted always so sessions persist across navigation */}
          <div className={page === 'terminals' ? 'h-full' : 'hidden'}>
            <Terminals visible={page === 'terminals'} />
          </div>
        </Layout>
      </TimezoneProvider>
    </SocketProvider>
  )
}
