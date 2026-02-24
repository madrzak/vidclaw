import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Folder, File, ChevronRight, ArrowLeft, Download, Eye, Pencil, Search, X, Trash2, ArrowUpDown, FileText, FileImage, FileVideo, FileAudio, FileCode, FileArchive, Loader2, RefreshCw, Copy, Check } from 'lucide-react'
import FilePreview from './FilePreview'
import { cn } from '@/lib/utils'
import { useSearch } from '@tanstack/react-router'
import PageSkeleton from '../PageSkeleton'
import CodeEditor from '../CodeEditor'
import { useFiles, useFileContent, useUpdateFileContent, useDeleteFile } from '@/hooks/queries/useFiles'
import { useSettings } from '@/hooks/queries/useSettings'
import { useQueryClient } from '@tanstack/react-query'
import type { FileEntry } from '@/types/api'

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'size-desc', label: 'Largest first' },
  { value: 'size-asc', label: 'Smallest first' },
]

function getFileIcon(name: string): React.ReactElement {
  const ext = name.split('.').pop()?.toLowerCase()
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv']
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java', 'sh', 'bash', 'css', 'scss', 'html', 'vue', 'svelte']
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z']
  const docExts = ['md', 'txt', 'pdf', 'doc', 'docx', 'rtf', 'csv', 'json', 'yaml', 'yml', 'xml', 'toml']

  if (ext && imageExts.includes(ext)) return <FileImage size={16} className="text-emerald-400 shrink-0" />
  if (ext && videoExts.includes(ext)) return <FileVideo size={16} className="text-purple-400 shrink-0" />
  if (ext && audioExts.includes(ext)) return <FileAudio size={16} className="text-pink-400 shrink-0" />
  if (ext && codeExts.includes(ext)) return <FileCode size={16} className="text-blue-400 shrink-0" />
  if (ext && archiveExts.includes(ext)) return <FileArchive size={16} className="text-orange-400 shrink-0" />
  if (ext && docExts.includes(ext)) return <FileText size={16} className="text-sky-400 shrink-0" />
  return <File size={16} className="text-muted-foreground shrink-0" />
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / Math.pow(1024, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function fuzzyMatch(pattern: string, text: string): number {
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

function isProtected(entryPath: string): boolean {
  const parts = entryPath.split('/')
  return parts.length === 1 && PROTECTED_PATHS.has(parts[0])
}

interface ContextMenu {
  x: number
  y: number
  entry: FileEntry
}

interface ScoredEntry extends FileEntry {
  score?: number
}

export default function FileBrowser() {
  const { openFile } = useSearch({ strict: false }) as { openFile?: string }
  const [currentPath, setCurrentPath] = useState('')
  const [initialLoad, setInitialLoad] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('name-asc')
  const [fuzzyFilter, setFuzzyFilter] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [ctxMenu, setCtxMenu] = useState<ContextMenu | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [copied, setCopied] = useState(false)
  const [pathInitialized, setPathInitialized] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  const { data: settingsData } = useSettings()
  const { data: entries, isLoading: loading, dataUpdatedAt, refetch: refetchFiles } = useFiles(currentPath)
  const { data: fileContentData, isLoading: fileContentLoading } = useFileContent(preview)
  const updateFileContent = useUpdateFileContent()
  const deleteFile = useDeleteFile()

  const entriesList = entries ?? []
  const fileContent = fileContentData?.content ?? null

  // Initialize path from openFile or settings
  useEffect(() => {
    if (pathInitialized) return
    if (openFile) {
      const parts = openFile.split('/')
      parts.pop()
      setCurrentPath(parts.join('/'))
      setPreview(openFile)
      setPathInitialized(true)
    } else if (settingsData) {
      if (settingsData.defaultFilePath) setCurrentPath(settingsData.defaultFilePath)
      setPathInitialized(true)
    }
  }, [openFile, settingsData, pathInitialized])

  // Track when data was last fetched
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastFetched(new Date(dataUpdatedAt))
      setInitialLoad(false)
    }
  }, [dataUpdatedAt])

  // Sync edit content when file content loads
  useEffect(() => {
    if (fileContentData) {
      setEditContent(fileContentData.content ?? '')
    }
  }, [fileContentData])

  // Refetch on visibility change
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchFiles()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetchFiles])

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const sortedAndFiltered = useMemo(() => {
    let result: ScoredEntry[] = entriesList

    if (fuzzyFilter) {
      result = result
        .map(e => ({ ...e, score: fuzzyMatch(fuzzyFilter, e.name) }))
        .filter(e => (e.score ?? -1) > 0)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    } else {
      const dirs = result.filter(e => e.isDirectory)
      const files = result.filter(e => !e.isDirectory)
      const [field, dir] = sortBy.split('-')
      const mul = dir === 'asc' ? 1 : -1

      const sorter = (a: FileEntry, b: FileEntry): number => {
        if (field === 'name') return mul * a.name.localeCompare(b.name)
        if (field === 'date') return mul * ((a.mtime || '').localeCompare(b.mtime || ''))
        if (field === 'size') return mul * ((a.size || 0) - (b.size || 0))
        return 0
      }

      result = [...dirs.sort(sorter), ...files.sort(sorter)]
    }

    return result
  }, [entriesList, sortBy, fuzzyFilter])

  function navigate(entry: FileEntry): void {
    if (entry.isDirectory) {
      setCurrentPath(entry.path)
      setPreview(null)
      setEditing(false)
      setSaveStatus('')
    } else {
      setPreview(entry.path)
      setEditing(false)
      setSaveStatus('')
      // Invalidate stale content cache for this file
      queryClient.invalidateQueries({ queryKey: ['files', 'content', entry.path] })
    }
  }

  function goUp(): void {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/'))
    setPreview(null)
    setEditing(false)
  }

  const scheduleAutosave = useCallback((content: string, filePath: string): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      updateFileContent.mutateAsync({ path: filePath, content })
        .then(() => {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(s => s === 'saved' ? '' : s), 2000)
        })
        .catch(() => setSaveStatus(''))
    }, 1500)
  }, [updateFileContent])

  function handleEditChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    const val = e.target.value
    setEditContent(val)
    if (preview) scheduleAutosave(val, preview)
  }

  function handleDelete(entry: FileEntry): void {
    if (!confirm(`Delete "${entry.name}"${entry.isDirectory ? ' and all its contents' : ''}?`)) return
    deleteFile.mutateAsync(entry.path)
      .then(() => {
        if (preview === entry.path) {
          setPreview(null)
          setEditing(false)
        }
      })
      .catch(() => alert('Failed to delete'))
  }

  function handleContextMenu(e: React.MouseEvent, entry: FileEntry): void {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : []

  if (initialLoad && !pathInitialized) return <PageSkeleton variant="files" />

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
          <div className="ml-auto flex items-center gap-2">
            {lastFetched && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {formatDate(lastFetched.toISOString())}
              </span>
            )}
            <button
              onClick={() => refetchFiles()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <span className="text-border">|</span>
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
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
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
            </>
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
              <div className="relative">
                <button
                  onClick={() => {
                    const text = editing ? editContent : fileContent
                    if (text == null) return
                    navigator.clipboard.writeText(text).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    })
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copy"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                {copied && (
                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs bg-popover border border-border text-foreground whitespace-nowrap shadow-lg">
                    Copied
                  </span>
                )}
              </div>
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
              <button onClick={() => { setPreview(null); setEditing(false); setSaveStatus('') }} className="text-muted-foreground hover:text-foreground text-xs">
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {editing ? (
              <CodeEditor
                value={editContent}
                onChange={handleEditChange}
                className="w-full h-full border-0 rounded-none"
              />
            ) : fileContent === null ? (
              <CodeEditor loading className="flex-1 border-0 rounded-none" />
            ) : (
              <FilePreview path={preview} content={fileContent} />
            )}
          </div>
        </div>
      )}

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
