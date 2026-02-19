import React, { useState, useEffect, useMemo } from 'react'
import { Search, Plus, X, Trash2, ChevronDown, ChevronRight, Package, FolderCog, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageSkeleton from '../PageSkeleton'

const API = '/api/skills'

const sourceMeta = {
  bundled: { label: 'Bundled', icon: Package, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  managed: { label: 'Managed', icon: FolderCog, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  workspace: { label: 'Workspace', icon: Briefcase, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      style={{ width: 36, height: 20, minWidth: 36, minHeight: 20, borderRadius: 10 }}
      className={cn(
        'relative inline-flex items-center transition-colors duration-200 focus:outline-none',
        checked ? 'bg-orange-500' : 'bg-zinc-600'
      )}
    >
      <span
        style={{ width: 14, height: 14, borderRadius: 7 }}
        className={cn(
          'inline-block bg-white transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  )
}

function SourceBadge({ source }) {
  const meta = sourceMeta[source] || sourceMeta.bundled
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border', meta.color)}>
      <Icon size={10} />
      {meta.label}
    </span>
  )
}

function CreateModal({ onClose, onCreated }) {
  React.useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description, instructions }),
      })
      if (res.ok) { onCreated(); onClose() }
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-xl sm:rounded-lg w-full max-w-lg p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Skill</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name (slug)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="my-skill"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this skill does"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Instructions (Markdown)</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={8} placeholder="# My Skill\n\nInstructions..."
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-orange-500 resize-y" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || loading}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50">
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SkillCard({ skill, onToggle, onDelete, onExpand, expanded }) {
  const [content, setContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    if (expanded && content === null) {
      setLoadingContent(true)
      fetch(`${API}/${encodeURIComponent(skill.id)}/content`)
        .then(r => r.json()).then(d => setContent(d.content || 'No content'))
        .catch(() => setContent('Failed to load'))
        .finally(() => setLoadingContent(false))
    }
  }, [expanded])

  return (
    <div className={cn(
      'border border-border rounded-lg bg-card/50 transition-all hover:border-orange-500/30',
      expanded && 'ring-1 ring-orange-500/20'
    )}>
      <div className="p-3 sm:p-4 cursor-pointer space-y-2" onClick={() => onExpand(skill.id)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-medium text-sm truncate">{skill.name}</span>
            <span className="hidden sm:inline-flex"><SourceBadge source={skill.source} /></span>
          </div>
          {skill.source === 'workspace' && (
            <button onClick={e => { e.stopPropagation(); onDelete(skill.id) }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          )}
          <div className="shrink-0 w-9"><Toggle checked={skill.enabled} onChange={v => onToggle(skill.id, v)} /></div>
        </div>
        {skill.description && <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{skill.description}</p>}
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {loadingContent ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>
          ) : (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-64 overflow-auto">{content}</pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function SkillsManager() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = () => fetch(API).then(r => r.json()).then(setSkills).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const toggle = async (id, enabled) => {
    await fetch(`${API}/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    load()
  }

  const del = async (id) => {
    if (!confirm('Delete this skill?')) return
    await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  const filtered = useMemo(() => skills.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.description || '').toLowerCase().includes(search.toLowerCase())) return false
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false
    if (statusFilter === 'enabled' && !s.enabled) return false
    if (statusFilter === 'disabled' && s.enabled) return false
    return true
  }), [skills, search, sourceFilter, statusFilter])

  const counts = useMemo(() => ({
    total: skills.length,
    enabled: skills.filter(s => s.enabled).length,
    bundled: skills.filter(s => s.source === 'bundled').length,
    managed: skills.filter(s => s.source === 'managed').length,
    workspace: skills.filter(s => s.source === 'workspace').length,
  }), [skills])

  if (loading) return <PageSkeleton variant="skills" />

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Skills', value: counts.total },
          { label: 'Enabled', value: counts.enabled },
          { label: 'Bundled', value: counts.bundled },
          { label: 'Workspace', value: counts.workspace },
        ].map(s => (
          <div key={s.label} className="bg-card/50 border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..."
            className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500">
          <option value="all">All Sources</option>
          <option value="bundled">Bundled</option>
          <option value="managed">Managed</option>
          <option value="workspace">Workspace</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500">
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-500 text-white transition-colors">
          <Plus size={14} /> Create Skill
        </button>
      </div>

      {/* Skills List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No skills found</div>
        ) : filtered.map(s => (
          <SkillCard key={s.id} skill={s} onToggle={toggle} onDelete={del}
            expanded={expanded === s.id} onExpand={id => setExpanded(expanded === id ? null : id)} />
        ))}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}
