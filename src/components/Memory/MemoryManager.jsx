import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Brain, FileText, Save, Check, Clock, Activity, ChevronRight, ChevronDown, RefreshCw, AlertTriangle, CheckCircle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageSkeleton from '../PageSkeleton'

function timeAgo(ts) {
  if (!ts) return 'never'
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'yesterday'
  return `${Math.floor(s / 86400)}d ago`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatTokens(n) {
  if (n < 1000) return n.toString()
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1000000).toFixed(2)}M`
}

function HealthBadge({ health }) {
  const styles = {
    fresh: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    aging: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    stale: 'bg-red-500/15 text-red-400 border-red-500/30',
  }
  const icons = { fresh: CheckCircle, aging: Timer, stale: AlertTriangle }
  const Icon = icons[health] || CheckCircle
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border', styles[health])}>
      <Icon size={10} />
      {health}
    </span>
  )
}

// --- Memory Files Panel ---
function MemoryFilesPanel() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastModified, setLastModified] = useState(null)
  const textareaRef = useRef(null)

  const isDirty = content !== savedContent

  const loadFiles = useCallback(async () => {
    try {
      const r = await fetch('api/memory/files')
      setFiles(await r.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const loadFile = useCallback(async (filePath) => {
    try {
      const r = await fetch(`api/memory/file?path=${encodeURIComponent(filePath)}`)
      const d = await r.json()
      setContent(d.content || '')
      setSavedContent(d.content || '')
      setLastModified(d.lastModified)
    } catch {}
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile)
  }, [selectedFile, loadFile])

  // Auto-select MEMORY.md
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const mem = files.find(f => f.path === 'MEMORY.md')
      setSelectedFile(mem ? mem.path : files[0].path)
    }
  }, [files, selectedFile])

  const handleSave = async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await fetch(`api/memory/file?path=${encodeURIComponent(selectedFile)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setSavedContent(content)
      setLastModified(new Date().toISOString())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadFiles()
    } catch {} finally { setSaving(false) }
  }

  // Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDirty, content, selectedFile])

  const memoryMd = files.find(f => f.path === 'MEMORY.md')
  const dailyFiles = files.filter(f => f.isDaily)

  if (loading) return <PageSkeleton variant="memory" />

  return (
    <div className="flex gap-4 h-full">
      {/* File list */}
      <div className="w-56 shrink-0 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Memory Files</span>
          <button onClick={loadFiles} className="text-muted-foreground hover:text-foreground">
            <RefreshCw size={12} />
          </button>
        </div>

        {/* MEMORY.md */}
        {memoryMd && (
          <button
            onClick={() => setSelectedFile(memoryMd.path)}
            className={cn(
              'w-full text-left px-2.5 py-2 rounded-md text-sm transition-colors',
              selectedFile === memoryMd.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Brain size={14} />
              <span className="font-medium">MEMORY.md</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px]">
              <HealthBadge health={memoryMd.health} />
              <span>{timeAgo(memoryMd.mtime)}</span>
            </div>
          </button>
        )}

        {dailyFiles.length > 0 && (
          <div className="pt-2 border-t border-border mt-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2.5">Daily Notes</span>
            {dailyFiles.map(f => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors mt-0.5',
                  selectedFile === f.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} />
                    <span>{f.name}</span>
                  </div>
                  <span className="text-[10px]">{formatBytes(f.size)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <p className="text-xs text-muted-foreground px-2.5 py-4">No memory files found.</p>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedFile}</span>
                {lastModified && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(lastModified)}
                  </span>
                )}
                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors',
                  isDirty ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'
                )}
              >
                {saved ? <Check size={12} /> : <Save size={12} />}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="flex-1 w-full bg-card border border-border rounded-md p-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a memory file to edit
          </div>
        )}
      </div>
    </div>
  )
}

// --- Sessions Panel ---
function SessionsPanel() {
  const [sessions, setSessions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [page, setPage] = useState(0)
  const LIMIT = 25

  const loadSessions = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const r = await fetch(`api/sessions?limit=${LIMIT}&offset=${offset}`)
      const d = await r.json()
      setSessions(d.sessions)
      setTotal(d.total)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSessions(page * LIMIT) }, [page, loadSessions])

  const loadDetail = async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    try {
      const r = await fetch(`api/sessions/${id}`)
      setSessionDetail(await r.json())
    } catch { setSessionDetail(null) }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{total} sessions total</span>
        <button onClick={() => loadSessions(page * LIMIT)} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="space-y-1">
        {sessions.map(s => (
          <div key={s.id} className="border border-border rounded-md overflow-hidden">
            <button
              onClick={() => loadDetail(s.id)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {expandedId === s.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="text-sm font-medium truncate">
                    {s.label || s.id.slice(0, 8)}
                  </span>
                  {s.channel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {s.channel}
                    </span>
                  )}
                  {s.model && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {s.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                  <span>{s.messageCount} msgs</span>
                  <span>{formatTokens(s.totalTokens)} tok</span>
                  {s.totalCost > 0 && <span>${s.totalCost.toFixed(4)}</span>}
                  <span>{timeAgo(s.lastTs)}</span>
                </div>
              </div>
            </button>

            {expandedId === s.id && sessionDetail && (
              <div className="border-t border-border px-3 py-2 bg-muted/30 max-h-80 overflow-y-auto">
                <div className="space-y-1.5">
                  {sessionDetail.messages?.map((m, i) => (
                    <div key={m.id || i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          m.role === 'user' ? 'bg-blue-500/15 text-blue-400' :
                          m.role === 'assistant' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {m.role || 'system'}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{timeAgo(m.timestamp)}</span>
                        {m.usage?.cost?.total && (
                          <span className="text-[10px] text-muted-foreground">${m.usage.cost.total.toFixed(4)}</span>
                        )}
                      </div>
                      {m.contentPreview && (
                        <p className="mt-0.5 text-muted-foreground line-clamp-2 pl-2 border-l border-border ml-1">
                          {m.contentPreview}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!sessionDetail.messages || sessionDetail.messages.length === 0) && (
                    <p className="text-muted-foreground text-xs">No messages in this session.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {loading && <p className="text-xs text-muted-foreground text-center">Loading…</p>}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---
export default function MemoryManager() {
  const [tab, setTab] = useState('memory')

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-border pb-2">
        <button
          onClick={() => setTab('memory')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
            tab === 'memory' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Brain size={14} />
          Memory Files
        </button>
        <button
          onClick={() => setTab('sessions')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
            tab === 'sessions' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Activity size={14} />
          Sessions
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'memory' && <MemoryFilesPanel />}
        {tab === 'sessions' && <SessionsPanel />}
      </div>
    </div>
  )
}
