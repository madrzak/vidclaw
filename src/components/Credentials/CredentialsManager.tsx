import React, { useState, useCallback } from 'react'
import { Lock, Plus, Pencil, Trash2, X, KeyRound, Upload, FileText, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCredentials, useSaveCredential, useDeleteCredential } from '@/hooks/queries/useCredentials'
import type { Credential } from '@/types/api'
import PageSkeleton from '../PageSkeleton'

const ACCEPTED_EXTENSIONS = '.json,.pem,.key,.p12,.pfx,.crt,.cert'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-xl sm:rounded-lg w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Lock size={16} className="text-orange-400" />{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface FileDropZoneProps {
  onFile: (file: File) => void
  selectedFile: File | null
}

function FileDropZone({ onFile, selectedFile }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        dragging ? "border-orange-400 bg-orange-500/10" : "border-border hover:border-muted-foreground/40"
      )}
      onClick={() => document.getElementById('cred-file-input')?.click()}
    >
      <input
        id="cred-file-input"
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
      {selectedFile ? (
        <div className="flex items-center justify-center gap-2 text-sm">
          <FileText size={16} className="text-orange-400" />
          <span className="font-mono">{selectedFile.name}</span>
          <span className="text-muted-foreground text-xs">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
        </div>
      ) : (
        <div className="space-y-1">
          <Upload size={24} className="mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Drop a file here or click to browse</p>
          <p className="text-[11px] text-muted-foreground/60">.json, .pem, .key, .p12, .pfx, .crt</p>
        </div>
      )}
    </div>
  )
}

interface CredentialModal {
  mode: 'add' | 'edit'
  name?: string
}

export default function CredentialsManager() {
  const { data: creds, isLoading: loading } = useCredentials()
  const saveCredential = useSaveCredential()
  const deleteCredential = useDeleteCredential()

  const credsList = creds ?? []

  const [modal, setModal] = useState<CredentialModal | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [credType, setCredType] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const openAdd = () => { setName(''); setValue(''); setCredType('text'); setSelectedFile(null); setModal({ mode: 'add' }) }
  const openEdit = (n: string) => { setName(n); setValue(''); setCredType('text'); setSelectedFile(null); setModal({ mode: 'edit', name: n }) }
  const close = () => { setModal(null); setName(''); setValue(''); setCredType('text'); setSelectedFile(null) }

  const readFileAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const save = async () => {
    if (!modal) return
    const slug = modal.mode === 'add' ? name.trim() : modal.name!
    if (!slug) return
    if (credType === 'text' && !value) return
    if (credType === 'file' && !selectedFile) return

    try {
      if (credType === 'file') {
        const b64 = await readFileAsBase64(selectedFile!)
        await saveCredential.mutateAsync({ name: slug, value: b64, type: 'file', fileName: selectedFile!.name })
      } else {
        await saveCredential.mutateAsync({ name: slug, value, type: 'text' })
      }
      close()
    } catch {}
  }

  const confirmDelete = (n: string) => { setDeleting(n) }
  const doDelete = async (n: string) => {
    await deleteCredential.mutateAsync(n)
    setDeleting(null)
  }

  const canSave = credType === 'text' ? !!value : !!selectedFile
  const canSubmit = canSave && (modal?.mode !== 'add' || !!name.trim())
  const saving = saveCredential.isPending

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-end">
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors">
          <Plus size={14} /> Add Credential
        </button>
      </div>

      {loading ? (
        <PageSkeleton variant="credentials" />
      ) : credsList.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <KeyRound size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No credentials stored yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credsList.map(c => (
            <div key={c.name} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-3 sm:px-4 group gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {c.type === 'file' ? (
                  <FileText size={14} className="text-orange-400 shrink-0" />
                ) : (
                  <Lock size={14} className="text-orange-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-mono font-medium block truncate">{c.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{new Date(c.modifiedAt).toLocaleString()}</span>
                    {c.type === 'file' && c.fileName && (
                      <span className="text-[11px] text-orange-400/70 font-mono truncate">{c.fileName}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(c.name)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" title="Update value">
                  <Pencil size={14} />
                </button>
                {deleting === c.name ? (
                  <button onClick={() => doDelete(c.name)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30">Confirm</button>
                ) : (
                  <button onClick={() => confirmDelete(c.name)} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-400" title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Credential' : 'Update Credential'} onClose={close}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              {modal.mode === 'add' ? (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="my-api-key"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500" />
              ) : (
                <div className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-muted-foreground">{modal.name}</div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <div className="flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => { setCredType('text'); setSelectedFile(null) }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                    credType === 'text' ? "bg-orange-500 text-white" : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Key size={13} /> Text
                </button>
                <button
                  onClick={() => { setCredType('file'); setValue('') }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                    credType === 'file' ? "bg-orange-500 text-white" : "bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload size={13} /> File
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{credType === 'text' ? 'Value' : 'File'}</label>
              {credType === 'text' ? (
                <input type="password" value={value} onChange={e => setValue(e.target.value)} placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500" />
              ) : (
                <FileDropZone onFile={setSelectedFile} selectedFile={selectedFile} />
              )}
            </div>

            <button onClick={save} disabled={saving || !canSubmit}
              className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-md text-sm font-medium transition-colors">
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
