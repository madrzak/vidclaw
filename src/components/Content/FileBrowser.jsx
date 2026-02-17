import React, { useState, useEffect, useMemo } from 'react'
import { Folder, File, ChevronRight, ArrowLeft, Download, Eye, ArrowUpDown, FileText, FileImage, FileVideo, FileAudio, FileCode, FileArchive } from 'lucide-react'
import FilePreview from './FilePreview'
import { cn } from '@/lib/utils'

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

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState('')
  const [entries, setEntries] = useState([])
  const [preview, setPreview] = useState(null)
  const [sortBy, setSortBy] = useState('name-asc')

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(currentPath)}`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => setEntries([]))
  }, [currentPath])

  const sortedEntries = useMemo(() => {
    const dirs = entries.filter(e => e.isDirectory)
    const files = entries.filter(e => !e.isDirectory)
    const [field, dir] = sortBy.split('-')
    const mul = dir === 'asc' ? 1 : -1

    const sorter = (a, b) => {
      if (field === 'name') return mul * a.name.localeCompare(b.name)
      if (field === 'date') return mul * ((a.mtime || '').localeCompare(b.mtime || ''))
      if (field === 'size') return mul * ((a.size || 0) - (b.size || 0))
      return 0
    }

    return [...dirs.sort(sorter), ...files.sort(sorter)]
  }, [entries, sortBy])

  function navigate(entry) {
    if (entry.isDirectory) {
      setCurrentPath(entry.path)
      setPreview(null)
    } else {
      setPreview(entry.path)
    }
  }

  function goUp() {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/'))
    setPreview(null)
  }

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
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {sortedEntries.map(entry => (
            <div
              key={entry.path}
              className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors group"
              onClick={() => navigate(entry)}
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
          {entries.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">Empty directory</div>
          )}
        </div>
      </div>

      {preview && (
        <div className="flex-1 border border-border rounded-xl bg-card/50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium truncate">{preview.split('/').pop()}</span>
            <div className="flex gap-2">
              <a href={`/api/files/download?path=${encodeURIComponent(preview)}`} className="text-muted-foreground hover:text-foreground">
                <Download size={14} />
              </a>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <FilePreview path={preview} />
          </div>
        </div>
      )}
    </div>
  )
}
