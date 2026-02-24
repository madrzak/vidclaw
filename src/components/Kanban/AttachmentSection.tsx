import React, { useState, useRef, useCallback } from 'react'
import { Paperclip, Upload, X, Trash2, Image, FileText, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Attachment } from '@/types/api'

interface AttachmentSectionProps {
  taskId: string
  attachments?: Attachment[]
  onChange?: () => void
  readOnly?: boolean
}

interface FileIconProps {
  mimeType: string
  size?: number
}

interface AttachmentBadgeProps {
  count: number | undefined
}

interface AttachmentThumbnailsProps {
  taskId: string
  attachments?: Attachment[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function isImage(mimeType: string): boolean {
  return !!mimeType && mimeType.startsWith('image/')
}

function FileIcon({ mimeType, size = 14 }: FileIconProps): React.ReactElement {
  if (isImage(mimeType)) return <Image size={size} className="text-blue-400" />
  if (mimeType && mimeType.includes('text')) return <FileText size={size} className="text-green-400" />
  return <File size={size} className="text-muted-foreground" />
}

export default function AttachmentSection({ taskId, attachments = [], onChange, readOnly = false }: AttachmentSectionProps): React.ReactElement {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightbox, setLightbox] = useState<Attachment | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const doUpload = useCallback(async (file: File) => {
    if (!file || !taskId) return
    setUploading(true)
    try {
      await api.tasks.attachments.upload(taskId, file)
      if (onChange) onChange()
    } catch (e) {
      alert('Upload failed: ' + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }, [taskId, onChange])

  const handleDelete = useCallback(async (filename: string) => {
    if (!confirm('Remove this attachment?')) return
    try {
      await api.tasks.attachments.delete(taskId, filename)
      if (onChange) onChange()
    } catch {}
  }, [taskId, onChange])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) doUpload(file)
  }, [doUpload])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) doUpload(file)
    e.target.value = ''
  }, [doUpload])

  const attachmentUrl = (filename: string): string => `/api/tasks/${taskId}/attachments/${filename}`

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Paperclip size={12} />
        Attachments {attachments.length > 0 && <span className="text-[10px] bg-primary/20 text-primary px-1.5 rounded-full">{attachments.length}</span>}
      </h3>

      {attachments.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {attachments.map((att) => (
            <div key={att.filename} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary/50 border border-border group">
              {isImage(att.mimeType) ? (
                <img
                  src={attachmentUrl(att.filename)}
                  alt={att.name}
                  className="w-8 h-8 rounded object-cover shrink-0 cursor-pointer hover:opacity-80"
                  onClick={() => setLightbox(att)}
                />
              ) : (
                <FileIcon mimeType={att.mimeType} />
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={attachmentUrl(att.filename)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium truncate block hover:text-primary transition-colors"
                >
                  {att.name}
                </a>
                <span className="text-[10px] text-muted-foreground">{formatSize(att.size)}</span>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(att.filename)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && taskId && (
        <div
          className={cn(
            'border border-dashed rounded-md p-3 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground',
            uploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-[11px] text-muted-foreground">
            {uploading ? 'Uploading...' : 'Drop file or click to upload (max 5MB)'}
          </p>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 bg-card border border-border rounded-full p-1 hover:bg-accent z-10"
            >
              <X size={14} />
            </button>
            <img
              src={attachmentUrl(lightbox.filename)}
              alt={lightbox.name}
              className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain"
            />
            <p className="text-center text-xs text-muted-foreground mt-2">{lightbox.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export function AttachmentBadge({ count }: AttachmentBadgeProps): React.ReactElement | null {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
      <Paperclip size={9} />
      {count}
    </span>
  )
}

export function AttachmentThumbnails({ taskId, attachments = [] }: AttachmentThumbnailsProps): React.ReactElement | null {
  const images = attachments.filter(a => isImage(a.mimeType)).slice(0, 3)
  if (!images.length) return null
  return (
    <div className="flex gap-1 mt-1.5">
      {images.map(att => (
        <img
          key={att.filename}
          src={`/api/tasks/${taskId}/attachments/${att.filename}`}
          alt={att.name}
          className="w-10 h-10 rounded object-cover border border-border"
        />
      ))}
      {attachments.filter(a => isImage(a.mimeType)).length > 3 && (
        <span className="text-[10px] text-muted-foreground self-end">+{attachments.filter(a => isImage(a.mimeType)).length - 3}</span>
      )}
    </div>
  )
}
