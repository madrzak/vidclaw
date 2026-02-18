import React, { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'
import UsageWidget from './Usage/UsageWidget'
import { LayoutDashboard, Calendar, FolderOpen, Puzzle, Heart, Settings, Menu, X, Coffee, Terminal } from 'lucide-react'

const navItems = [
  { id: 'kanban', label: 'Tasks', icon: LayoutDashboard },
  { id: 'calendar', label: 'Activity', icon: Calendar },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'terminals', label: 'Terminals', icon: Terminal },
  { id: 'skills', label: 'Skills', icon: Puzzle },
  { id: 'soul', label: 'Soul', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const pageLabels = {
  kanban: 'Task Board',
  calendar: 'Activity Calendar',
  files: 'Content Browser',
  terminals: 'Terminals',
  skills: 'Skills Manager',
  soul: 'Soul Editor',
  settings: 'Settings',
}

export default function Layout({ page, setPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef(null)
  const logoRef = useRef(null)
  const navRef = useRef(null)
  const headerLabelRef = useRef(null)
  const prevPageRef = useRef(page)

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

  // GSAP sidebar entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(logoRef.current,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5 }
      )

      tl.fromTo(navRef.current?.children || [],
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.04 },
        '-=0.3'
      )
    }, sidebarRef)

    return () => ctx.revert()
  }, [])

  // Header label transition on page change
  useEffect(() => {
    if (prevPageRef.current !== page && headerLabelRef.current) {
      gsap.fromTo(headerLabelRef.current,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
    prevPageRef.current = page
  }, [page])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside ref={sidebarRef} className={cn(
        'w-56 shrink-0 border-r border-border/60 bg-card/40 flex flex-col backdrop-blur-sm z-50 transition-transform duration-200',
        'fixed inset-y-0 left-0 md:relative md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div ref={logoRef} className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              VidClaw
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

        <nav ref={navRef} className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={() => setPage(item.id)}
            />
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: 'status-pulse 2s ease-in-out infinite' }} />
            <span className="text-[11px] text-muted-foreground font-mono">localhost:3333</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-12 border-b border-border/60 flex items-center justify-between px-4 shrink-0 bg-card/20 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu size={20} />
            </button>
            <span ref={headerLabelRef} className="text-sm font-semibold tracking-tight">
              {pageLabels[page] || page}
            </span>
          </div>
          <div className="flex items-center gap-3">
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavButton({ item, active, onClick }) {
  const ref = useRef(null)

  const handleMouseEnter = () => {
    if (!active) {
      gsap.to(ref.current, { x: 3, duration: 0.2, ease: 'power2.out' })
    }
  }
  const handleMouseLeave = () => {
    if (!active) {
      gsap.to(ref.current, { x: 0, duration: 0.2, ease: 'power2.out' })
    }
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors duration-200 relative',
        active
          ? 'bg-primary/10 text-primary font-semibold nav-active'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      )}
    >
      <item.icon size={15} strokeWidth={active ? 2.5 : 2} />
      {item.label}
    </button>
  )
}
