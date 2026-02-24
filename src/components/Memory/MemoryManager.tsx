import React, { useState, useEffect, useRef } from 'react'
import { Brain, FileText, Save, Check, Clock, Activity, ChevronRight, ChevronDown, RefreshCw, AlertTriangle, CheckCircle, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageSkeleton from '../PageSkeleton'
import CodeEditor from '../CodeEditor'
import { useMemoryFiles, useMemoryFile, useSaveMemoryFile, useSessions, useSessionDetail } from '@/hooks/queries/useMemory'
import type { MemoryFile, SessionDetail } from '@/types/api'
import { useQueryClient } from '@tanstack/react-query'

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return 'never'
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'yesterday'
  return `${Math.floor(s / 86400)}d ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toString()
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`
  return `${(n / 1000000).toFixed(2)}M`
}

type HealthStatus = 'fresh' | 'aging' | 'stale'

interface HealthBadgeProps {
  health: HealthStatus
}

function HealthBadge({ health }: HealthBadgeProps) {
  const styles: Record<HealthStatus, string> = {
    fresh: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    aging: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    stale: 'bg-red-500/15 text-red-400 border-red-500/30',
  }
  const icons: Record<HealthStatus, React.ElementType> = { fresh: CheckCircle, aging: Timer, stale: AlertTriangle }
  const Icon = icons[health] || CheckCircle
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border', styles[health])}>
      <Icon size={10} />
      {health}
    </span>
  )
}

function MemoryFilesPanel() {
  const { data: filesData, isLoading: loading, refetch: refetchFiles } = useMemoryFiles()
  const files = filesData ?? []

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [savedContent, setSavedContent] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)
  const [lastModified, setLastModified] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const queryClient = useQueryClient()

  const { data: fileData, isLoading: fileLoading } = useMemoryFile(selectedFile)
  const saveMemoryFile = useSaveMemoryFile()

  const isDirty = content !== savedContent

  // Sync file content when file data loads
  useEffect(() => {
    if (fileData) {
      setContent(fileData.content || '')
      setSavedContent(fileData.content || '')
      setLastModified(fileData.lastModified)
    }
  }, [fileData])

  // Auto-select first file
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const mem = files.find(f => f.path === 'MEMORY.md')
      setSelectedFile(mem ? mem.path : files[0].path)
    }
  }, [files, selectedFile])

  const handleSave = async (): Promise<void> => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await saveMemoryFile.mutateAsync({ path: selectedFile, content })
      setSavedContent(content)
      setLastModified(new Date().toISOString())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally { setSaving(false) }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
      <div className="w-56 shrink-0 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Memory Files</span>
          <button onClick={() => refetchFiles()} className="text-muted-foreground hover:text-foreground">
            <RefreshCw size={12} />
          </button>
        </div>

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
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
              </button>
            </div>
            <CodeEditor
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              loading={fileLoading}
              className="flex-1 w-full rounded-md p-3"
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

const LIMIT = 25

function SessionsPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState<number>(0)

  const { data: sessionsData, isLoading: loading, refetch: refetchSessions } = useSessions({ limit: LIMIT, offset: page * LIMIT })
  const { data: sessionDetail } = useSessionDetail(expandedId)

  const sessions = sessionsData?.sessions ?? []
  const total = sessionsData?.total ?? 0

  const loadDetail = (id: string): void => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{total} sessions total</span>
        <button onClick={() => refetchSessions()} className="text-muted-foreground hover:text-foreground">
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
                        {(m.usage as { cost?: { total?: number } } | undefined)?.cost?.total != null && (
                          <span className="text-[10px] text-muted-foreground">${(m.usage as { cost: { total: number } }).cost.total.toFixed(4)}</span>
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

      {loading && <p className="text-xs text-muted-foreground text-center">Loading...</p>}

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

type MemoryTab = 'memory' | 'sessions'

export default function MemoryManager() {
  const [tab, setTab] = useState<MemoryTab>('memory')

  return (
    <div className="h-full flex flex-col">
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

      <div className="flex-1 min-h-0">
        {tab === 'memory' && <MemoryFilesPanel />}
        {tab === 'sessions' && <SessionsPanel />}
      </div>
    </div>
  )
}
