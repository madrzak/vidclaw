import React, { useState, useEffect, useCallback } from 'react'
import { Lock, Plus, Pencil, Trash2, X, KeyRound, Shield, Upload, FileText, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

const API = '/api/credentials'
const ACCEPTED_EXTENSIONS = '.json,.pem,.key,.p12,.pfx,.crt,.cert'

function Modal({ title, onClose, children }) {
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

function FileDropZone({ onFile, selectedFile }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = useCallback((e) => {
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
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
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

export default function CredentialsManager() {
  const [creds, setCreds] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [credType, setCredType] = useState('text') // 'text' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch(API).then(r => r.json()).then(setCreds).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => { setName(''); setValue(''); setCredType('text'); setSelectedFile(null); setModal({ mode: 'add' }) }
  const openEdit = (n) => { setName(n); setValue(''); setCredType('text'); setSelectedFile(null); setModal({ mode: 'edit', name: n }) }
  const close = () => { setModal(null); setName(''); setValue(''); setCredType('text'); setSelectedFile(null) }

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // strip data:...;base64,
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const save = async () => {
    const slug = modal.mode === 'add' ? name.trim() : modal.name
    if (!slug) return
    if (credType === 'text' && !value) return
    if (credType === 'file' && !selectedFile) return

    setSaving(true)
    try {
      let body
      if (credType === 'file') {
        const b64 = await readFileAsBase64(selectedFile)
        body = { value: b64, type: 'file', fileName: selectedFile.name }
      } else {
        body = { value, type: 'text' }
      }
      const res = await fetch(`${API}/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { close(); load() }
    } finally { setSaving(false) }
  }

  const confirmDelete = async (n) => { setDeleting(n) }
  const doDelete = async (n) => {
    await fetch(`${API}/${encodeURIComponent(n)}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const canSave = credType === 'text' ? !!value : !!selectedFile
  const canSubmit = canSave && (modal?.mode !== 'add' || !!name.trim())

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-orange-400" />
          <h1 className="text-lg font-semibold">Credentials</h1>
          <span className="text-xs text-muted-foreground">~/.openclaw/credentials/</span>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors">
          <Plus size={14} /> Add Credential
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : creds.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <KeyRound size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No credentials stored yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creds.map(c => (
            <div key={c.name} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 group">
              <div className="flex items-center gap-3 min-w-0">
                {c.type === 'file' ? (
                  <FileText size={14} className="text-orange-400 shrink-0" />
                ) : (
                  <Lock size={14} className="text-orange-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-mono font-medium block truncate">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{new Date(c.modifiedAt).toLocaleString()}</span>
                    {c.type === 'file' && c.fileName && (
                      <span className="text-[11px] text-orange-400/70 font-mono">{c.fileName}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {/* Type toggle */}
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

            {/* Value input */}
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
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
