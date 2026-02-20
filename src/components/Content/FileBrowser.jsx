import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Folder, File, ChevronRight, ArrowLeft, Download, Eye, Pencil, Search, X, Trash2, ArrowUpDown, FileText, FileImage, FileVideo, FileAudio, FileCode, FileArchive } from 'lucide-react'
import FilePreview from './FilePreview'
import { cn } from '@/lib/utils'
import { useNav } from '@/hooks/useNav'
import PageSkeleton from '../PageSkeleton'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'size-desc', label: 'Largest first' },
  { value: 'size-asc', label: 'Smallest first' },
]

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java', 'sh', 'bash', 'css', 'scss', 'html', 'vue', 'svelte']
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z']
  const docExts = ['md', 'txt', 'pdf', 'doc', 'docx', 'rtf', 'csv', 'json', 'yaml', 'yml', 'xml', 'toml']

  if (imageExts.includes(ext)) return <FileImage size={16} className="text-emerald-400 shrink-0" />
  if (videoExts.includes(ext)) return <FileVideo size={16} className="text-purple-400 shrink-0" />
  if (audioExts.includes(ext)) return <FileAudio size={16} className="text-pink-400 shrink-0" />
  if (codeExts.includes(ext)) return <FileCode size={16} className="text-blue-400 shrink-0" />
  if (archiveExts.includes(ext)) return <FileArchive size={16} className="text-orange-400 shrink-0" />
  if (docExts.includes(ext)) return <FileText size={16} className="text-sky-400 shrink-0" />
  return <File size={16} className="text-muted-foreground shrink-0" />
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

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

const PROTECTED_PATHS = new Set([
  'SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md',
  'MEMORY.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'TOOLS.md',
  'dashboard', '.git',
])

function isProtected(entryPath) {
  const parts = entryPath.split('/')
  return parts.length === 1 && PROTECTED_PATHS.has(parts[0])
}

export default function FileBrowser() {
  const { consumeNavData } = useNav()
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [sortBy, setSortBy] = useState('name-asc')
  const [fuzzyFilter, setFuzzyFilter] = useState('')
  const [fileContent, setFileContent] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [ctxMenu, setCtxMenu] = useState(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    const data = consumeNavData()
    if (data?.openFile) {
      const parts = data.openFile.split('/')
      parts.pop()
      setCurrentPath(parts.join('/'))
      setPreview(data.openFile)
    }
  }, [])

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(currentPath)}`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [currentPath])

  // Close context menu on click anywhere
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const sortedAndFiltered = useMemo(() => {
    let result = entries

    // Apply fuzzy filter first
    if (fuzzyFilter) {
      result = result
        .map(e => ({ ...e, score: fuzzyMatch(fuzzyFilter, e.name) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
    } else {
      // Apply sorting when not filtering
      const dirs = result.filter(e => e.isDirectory)
      const files = result.filter(e => !e.isDirectory)
      const [field, dir] = sortBy.split('-')
      const mul = dir === 'asc' ? 1 : -1

      const sorter = (a, b) => {
        if (field === 'name') return mul * a.name.localeCompare(b.name)
        if (field === 'date') return mul * ((a.mtime || '').localeCompare(b.mtime || ''))
        if (field === 'size') return mul * ((a.size || 0) - (b.size || 0))
        return 0
      }

      result = [...dirs.sort(sorter), ...files.sort(sorter)]
    }

    return result
  }, [entries, sortBy, fuzzyFilter])

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
    if (!confirm(`Delete "${entry.name}"${entry.isDirectory ? ' and all its contents' : ''}?`)) return
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
      .catch(() => alert('Failed to delete'))
  }

  function handleContextMenu(e, entry) {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : []

  if (loading) return <PageSkeleton variant="files" />

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
          <div className="ml-auto flex items-center gap-1">
            <ArrowUpDown size={14} className="text-muted-foreground" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-muted-foreground hover:text-foreground border-none outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
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
          {sortedAndFiltered.map(entry => (
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
                getFileIcon(entry.name)
              )}
              <span className="text-sm flex-1 truncate">{entry.name}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
                {entry.mtime ? formatDate(entry.mtime) : ''}
              </span>
              {!entry.isDirectory && (
                <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap w-16 text-right">
                  {formatSize(entry.size || 0)}
                </span>
              )}
              {entry.isDirectory && <span className="w-16 hidden sm:inline" />}
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
          {sortedAndFiltered.length === 0 && (
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
            onClick={() => { if (!isProtected(ctxMenu.entry.path)) { handleDelete(ctxMenu.entry); setCtxMenu(null) } }}
            disabled={isProtected(ctxMenu.entry.path)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors',
              isProtected(ctxMenu.entry.path)
                ? 'text-muted-foreground/40 cursor-not-allowed'
                : 'text-red-400 hover:bg-accent/50'
            )}
          >
            <Trash2 size={14} /> Delete{isProtected(ctxMenu.entry.path) ? ' (protected)' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
