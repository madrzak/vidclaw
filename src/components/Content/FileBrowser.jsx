import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Folder, File, ChevronRight, ArrowLeft, Download, Eye, Pencil, Search, X, Trash2 } from 'lucide-react'
import FilePreview from './FilePreview'
import { cn } from '@/lib/utils'

function fuzzyMatch(pattern, text) {
  const p = pattern.toLowerCase()
  const t = text.toLowerCase()
  let pi = 0
  let score = 0
  let prevMatch = -1
  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) {
      score += (prevMatch === ti - 1) ? 2 : 1
      prevMatch = ti
      pi++
    }
  }
  return pi === p.length ? score : -1
}

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [preview, setPreview] = useState(null)
  const [fuzzyFilter, setFuzzyFilter] = useState('')
  const [fileContent, setFileContent] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [ctxMenu, setCtxMenu] = useState(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(currentPath)}`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [currentPath])

  // Close context menu on click anywhere
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  function fetchFileContent(filePath) {
    fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => {
        setFileContent(d.content)
        setEditContent(d.content)
      })
      .catch(() => {
        setFileContent('Failed to load file')
        setEditContent('')
      })
  }

  function navigate(entry) {
    if (entry.isDirectory) {
      setCurrentPath(entry.path)
      setPreview(null)
      setFileContent(null)
      setEditing(false)
      setSaveStatus('')
    } else {
      setPreview(entry.path)
      setEditing(false)
      setSaveStatus('')
      fetchFileContent(entry.path)
    }
  }

  function goUp() {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/'))
    setPreview(null)
    setFileContent(null)
    setEditing(false)
  }

  const scheduleAutosave = useCallback((content, filePath) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/files/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      })
        .then(r => r.json())
        .then(() => {
          setSaveStatus('saved')
          setFileContent(content)
          setTimeout(() => setSaveStatus(s => s === 'saved' ? '' : s), 2000)
        })
        .catch(() => setSaveStatus(''))
    }, 1500)
  }, [])

  function handleEditChange(e) {
    const val = e.target.value
    setEditContent(val)
    scheduleAutosave(val, preview)
  }

  function handleDelete(entry) {
    if (!confirm(`Delete "${entry.name}"?`)) return
    fetch(`/api/files?path=${encodeURIComponent(entry.path)}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setEntries(prev => prev.filter(e => e.path !== entry.path))
          if (preview === entry.path) {
            setPreview(null)
            setFileContent(null)
            setEditing(false)
          }
        }
      })
      .catch(() => {})
  }

  function handleContextMenu(e, entry) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const filtered = fuzzyFilter
    ? entries
        .map(e => ({ ...e, score: fuzzyMatch(fuzzyFilter, e.name) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
    : entries

  const breadcrumbs = currentPath ? currentPath.split('/') : []

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <div className={cn('flex flex-col border border-border rounded-xl bg-card/50 overflow-hidden', preview ? 'md:w-1/3 max-h-[50vh] md:max-h-none' : 'flex-1')}>
        <div className="flex items-center gap-2 p-3 border-b border-border text-sm">
          {currentPath && (
            <button onClick={goUp} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="text-muted-foreground">~/</span>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} className="text-muted-foreground" />
              <button
                onClick={() => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'))}
                className="hover:text-primary transition-colors"
              >
                {b}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Fuzzy filter */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={fuzzyFilter}
            onChange={e => setFuzzyFilter(e.target.value)}
            placeholder="Filter files..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {fuzzyFilter && (
            <button onClick={() => setFuzzyFilter('')} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.map(entry => (
            <div
              key={entry.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors group',
                preview === entry.path && 'bg-accent/50'
              )}
              onClick={() => navigate(entry)}
              onContextMenu={e => handleContextMenu(e, entry)}
            >
              {entry.isDirectory ? (
                <Folder size={16} className="text-amber-400 shrink-0" />
              ) : (
                <File size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className="text-sm flex-1 truncate">{entry.name}</span>
              {!entry.isDirectory && (
                <a
                  href={`/api/files/download?path=${encodeURIComponent(entry.path)}`}
                  onClick={e => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Download size={14} />
                </a>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {fuzzyFilter ? 'No matches' : 'Empty directory'}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <div className="flex-1 border border-border rounded-xl bg-card/50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium truncate">{preview.split('/').pop()}</span>
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && <span className="text-xs text-muted-foreground">Saving...</span>}
              {saveStatus === 'saved' && <span className="text-xs text-green-400">Saved</span>}
              <button
                onClick={() => { setEditing(!editing); setSaveStatus('') }}
                className="text-muted-foreground hover:text-foreground"
                title={editing ? 'Preview' : 'Edit'}
              >
                {editing ? <Eye size={14} /> : <Pencil size={14} />}
              </button>
              <a href={`/api/files/download?path=${encodeURIComponent(preview)}`} className="text-muted-foreground hover:text-foreground">
                <Download size={14} />
              </a>
              <button onClick={() => { setPreview(null); setFileContent(null); setEditing(false); setSaveStatus('') }} className="text-muted-foreground hover:text-foreground text-xs">
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {editing ? (
              <textarea
                value={editContent}
                onChange={handleEditChange}
                className="w-full h-full p-4 bg-transparent text-sm font-mono resize-none outline-none"
                spellCheck={false}
              />
            ) : fileContent === null ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <FilePreview path={preview} content={fileContent} />
            )}
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={() => { handleDelete(ctxMenu.entry); setCtxMenu(null) }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-accent/50 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
