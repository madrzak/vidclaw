import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import UsageWidget from './Usage/UsageWidget'
import { LayoutDashboard, Calendar, FolderOpen, Puzzle, Heart, Settings, Menu, X, Coffee, Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeContext'

const navItems = [
  { id: 'kanban', label: 'Tasks', icon: LayoutDashboard },
  { id: 'calendar', label: 'Activity', icon: Calendar },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'skills', label: 'Skills', icon: Puzzle },
  { id: 'soul', label: 'Soul', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Layout({ page, setPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  // Close sidebar on page change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [page])

  // Close sidebar on escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'w-56 shrink-0 border-r border-border bg-card flex flex-col z-50 transition-transform duration-200',
        // Mobile: fixed overlay, hidden by default
        'fixed inset-y-0 left-0 md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              ⚡ VidClaw
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Clawmand Center</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                page === item.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          localhost:3333
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium capitalize">{page === 'kanban' ? 'Task Board' : page === 'calendar' ? 'Activity Calendar' : page === 'skills' ? 'Skills Manager' : page === 'soul' ? 'Soul Editor' : page === 'settings' ? 'Settings' : 'Content Browser'}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a
              href="https://buy.stripe.com/8x2aEX0Wl7Wv7Roag9cEw0f"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-amber-400 transition-colors"
            >
              <Coffee size={12} />
              <span className="hidden sm:inline">Buy me a coffee</span>
            </a>
            <UsageWidget />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-2 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
