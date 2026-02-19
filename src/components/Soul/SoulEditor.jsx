import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Save, RotateCcw, Check, Clock, FileText, Sparkles, History, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageSkeleton from '../PageSkeleton'

const FILE_TABS = [
  { name: 'SOUL.md', label: 'Soul' },
  { name: 'IDENTITY.md', label: 'Identity' },
  { name: 'USER.md', label: 'User' },
  { name: 'AGENTS.md', label: 'Agents' },
]

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'yesterday'
  return `${Math.floor(s / 86400)}d ago`
}

export default function SoulEditor() {
  const [loading, setLoading] = useState(true)
  const [activeFile, setActiveFile] = useState('SOUL.md')
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [lastModified, setLastModified] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [rightTab, setRightTab] = useState('templates')
  const [templates, setTemplates] = useState([])
  const [history, setHistory] = useState([])
  const [previewContent, setPreviewContent] = useState(null)
  const textareaRef = useRef(null)

  const isDirty = content !== savedContent
  const isSoul = activeFile === 'SOUL.md'

  const loadFile = useCallback(async (name) => {
    try {
      const url = name === 'SOUL.md' ? 'api/soul' : `api/workspace-file?name=${name}`
      const r = await fetch(url)
      const d = await r.json()
      setContent(d.content || '')
      setSavedContent(d.content || '')
      setLastModified(d.lastModified)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async (name) => {
    try {
      const url = name === 'SOUL.md' ? 'api/soul/history' : `api/workspace-file/history?name=${name}`
      const r = await fetch(url)
      setHistory(await r.json())
    } catch { setHistory([]) }
  }, [])

  useEffect(() => { loadFile(activeFile); loadHistory(activeFile) }, [activeFile, loadFile, loadHistory])

  useEffect(() => {
    if (isSoul) fetch('api/soul/templates').then(r => r.json()).then(setTemplates).catch(() => {})
  }, [isSoul])

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = activeFile === 'SOUL.md' ? 'api/soul' : `api/workspace-file?name=${activeFile}`
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      setSavedContent(content)
      setLastModified(new Date().toISOString())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      loadHistory(activeFile)
    } catch {} finally { setSaving(false) }
  }

  const handleRevert = async (idx) => {
    if (!confirm('Revert to this version? Current content will be saved to history.')) return
    if (activeFile === 'SOUL.md') {
      const r = await fetch('api/soul/revert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: idx }) })
      const d = await r.json()
      if (d.success) { setContent(d.content); setSavedContent(d.content); loadHistory(activeFile) }
    } else {
      // For other files, load version content and save
      const ver = history[idx]
      if (!ver) return
      const url = `api/workspace-file?name=${activeFile}`
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: ver.content }) })
      setContent(ver.content); setSavedContent(ver.content); loadHistory(activeFile)
    }
  }

  const applyTemplate = (t) => {
    if (isDirty && !confirm('You have unsaved changes. Apply template anyway?')) return
    setContent(t.content)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const start = ta.selectionStart, end = ta.selectionEnd
      setContent(content.substring(0, start) + '  ' + content.substring(end))
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
  }

  if (loading) return <PageSkeleton variant="soul" />

  return (
    <div className="h-full flex flex-col gap-3">
      {/* File tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 w-fit">
        {FILE_TABS.map(f => (
          <button key={f.name} onClick={() => { if (isDirty && !confirm('Discard unsaved changes?')) return; setActiveFile(f.name); setPreviewContent(null) }}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative',
              activeFile === f.name ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
            {f.label}
            {activeFile === f.name && isDirty && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400" />}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <textarea ref={textareaRef} value={previewContent ?? content}
              onChange={e => { setPreviewContent(null); setContent(e.target.value) }}
              onKeyDown={handleKeyDown}
              readOnly={previewContent !== null}
              className={cn('w-full h-full resize-none bg-[#1a1a2e] border border-border rounded-lg p-4 text-sm font-mono leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50',
                previewContent !== null && 'opacity-70')}
              spellCheck={false} />
            {previewContent !== null && (
              <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                Preview — click editor to dismiss
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{content.length} chars</span>
              {lastModified && <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(lastModified)}</span>}
              {isDirty && <span className="text-yellow-400">● Unsaved changes</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { loadFile(activeFile); setPreviewContent(null) }}
                className="px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <RotateCcw size={12} className="inline mr-1" />Reset
              </button>
              <button onClick={handleSave} disabled={!isDirty && !saving}
                className={cn('px-4 py-1.5 text-xs rounded-md font-medium transition-all',
                  saved ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  (!isDirty && !saving) && 'opacity-50 cursor-not-allowed')}>
                {saved ? <><Check size={12} className="inline mr-1" />Saved</> : saving ? 'Saving...' : <><Save size={12} className="inline mr-1" />Save</>}
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 flex flex-col bg-card rounded-lg border border-border">
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
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
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
