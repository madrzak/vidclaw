import React, { useState, useEffect, useRef } from 'react'
import { Save, RotateCcw, Check, Clock, FileText, Sparkles, History, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageSkeleton from '../PageSkeleton'
import CodeEditor from '../CodeEditor'
import { useSoulFile, useSoulHistory, useSoulTemplates, useSaveSoul, useRevertSoul } from '@/hooks/queries/useSoul'
import type { SoulTemplate, HistoryEntry } from '@/types/api'

interface FileTab {
  name: string
  label: string
}

const FILE_TABS: FileTab[] = [
  { name: 'SOUL.md', label: 'Soul' },
  { name: 'IDENTITY.md', label: 'Identity' },
  { name: 'USER.md', label: 'User' },
  { name: 'AGENTS.md', label: 'Agents' },
]

function timeAgo(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'yesterday'
  return `${Math.floor(s / 86400)}d ago`
}

export default function SoulEditor() {
  const [activeFile, setActiveFile] = useState<string>('SOUL.md')
  const [content, setContent] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [saved, setSaved] = useState<boolean>(false)
  const [rightTab, setRightTab] = useState<'templates' | 'history'>('templates')
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const isSoul = activeFile === 'SOUL.md'

  const fileQuery = useSoulFile(activeFile)
  const historyQuery = useSoulHistory(activeFile)
  const templatesQuery = useSoulTemplates()
  const saveMutation = useSaveSoul()
  const revertMutation = useRevertSoul()

  // Sync editor content from query data
  useEffect(() => {
    if (fileQuery.data?.content != null) setContent(fileQuery.data.content)
  }, [fileQuery.data])

  const savedContent = fileQuery.data?.content ?? ''
  const lastModified = fileQuery.data?.lastModified ?? null
  const isDirty = content !== savedContent
  const templates = templatesQuery.data ?? []
  const history = historyQuery.data ?? []
  const fileLoading = fileQuery.isFetching && !fileQuery.data

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await saveMutation.mutateAsync({ name: activeFile, content })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {} finally { setSaving(false) }
  }

  const handleRevert = async (idx: number): Promise<void> => {
    if (!confirm('Revert to this version? Current content will be saved to history.')) return
    try {
      if (activeFile === 'SOUL.md') {
        const d = await revertMutation.mutateAsync(idx)
        if (d.success) setContent(d.content)
      } else {
        const ver = history[idx]
        if (!ver) return
        await saveMutation.mutateAsync({ name: activeFile, content: ver.content })
        setContent(ver.content)
      }
    } catch {}
  }

  const applyTemplate = (t: SoulTemplate): void => {
    if (isDirty && !confirm('You have unsaved changes. Apply template anyway?')) return
    setContent(t.content)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart, end = ta.selectionEnd
      setContent(content.substring(0, start) + '  ' + content.substring(end))
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
  }

  const handleReset = (): void => {
    fileQuery.refetch()
    setPreviewContent(null)
  }

  if (fileQuery.isLoading) return <PageSkeleton variant="soul" />

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
        {FILE_TABS.map(f => (
          <button key={f.name} onClick={() => { if (isDirty && !confirm('Discard unsaved changes?')) return; setActiveFile(f.name); setPreviewContent(null) }}
            className={cn('flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative whitespace-nowrap',
              activeFile === f.name ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
            {f.label}
            {activeFile === f.name && isDirty && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400" />}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 min-h-[300px]">
          <div className="flex-1 relative">
            <CodeEditor
              ref={textareaRef}
              value={previewContent ?? content}
              onChange={e => { setPreviewContent(null); setContent(e.target.value) }}
              onKeyDown={handleKeyDown}
              readOnly={previewContent !== null}
              loading={fileLoading}
              className={cn('w-full h-full leading-relaxed', previewContent !== null && 'opacity-70')}
            />
            {!fileLoading && previewContent !== null && (
              <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                Preview — click editor to dismiss
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{content.length} chars</span>
              {lastModified && <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(lastModified)}</span>}
              {isDirty && <span className="text-yellow-400">● Unsaved changes</span>}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleReset}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <RotateCcw size={12} className="inline mr-1" />Reset
              </button>
              <button onClick={handleSave} disabled={!isDirty && !saving}
                className={cn('flex-1 sm:flex-none px-4 py-1.5 text-xs rounded-md font-medium transition-all',
                  saved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  (!isDirty && !saving) && 'opacity-50 cursor-not-allowed')}>
                {saved ? <><Check size={12} className="inline mr-1" />Saved</> : saving ? 'Saving...' : <><Save size={12} className="inline mr-1" />Save</>}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0 flex flex-col bg-card rounded-lg border border-border max-h-[300px] lg:max-h-none">
          <div className="flex border-b border-border">
            {isSoul && (
              <button onClick={() => setRightTab('templates')}
                className={cn('flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  rightTab === 'templates' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
                <Sparkles size={12} className="inline mr-1" />Templates
              </button>
            )}
            <button onClick={() => setRightTab('history')}
              className={cn('flex-1 px-3 py-2 text-xs font-medium transition-colors',
                rightTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground')}>
              <History size={12} className="inline mr-1" />History
            </button>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {rightTab === 'templates' && isSoul && (
              <div className="space-y-2">
                {templates.map((t, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border hover:border-primary/40 hover:shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all cursor-pointer group"
                    onClick={() => setPreviewContent(t.content)}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{t.name}</span>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); applyTemplate(t) }}
                      className="mt-2 text-xs text-primary hover:text-primary/80 font-medium">
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            )}

            {rightTab === 'history' && (
              <div className="space-y-1">
                {history.length === 0 && <p className="text-xs text-muted-foreground p-2">No history yet</p>}
                {[...history].reverse().map((h, i) => {
                  const realIdx = history.length - 1 - i
                  return (
                    <div key={i} className="p-2 rounded-md hover:bg-accent transition-colors cursor-pointer group"
                      onClick={() => setPreviewContent(h.content)}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{timeAgo(h.timestamp)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleRevert(realIdx) }}
                          className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Revert
                        </button>
                      </div>
                      <p className="text-xs text-foreground/70 mt-1 truncate font-mono">
                        {h.content.substring(0, 80)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
