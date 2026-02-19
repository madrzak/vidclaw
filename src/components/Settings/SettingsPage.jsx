import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Settings, Clock, Globe, Save, Check, Loader2, Search, ChevronDown, Package, Zap, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTimezone } from '../TimezoneContext'
import PageSkeleton from '../PageSkeleton'

const HEARTBEAT_OPTIONS = [
  { value: '5m', label: '5 minutes' },
  { value: '10m', label: '10 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
]

const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone')

function TimezoneCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const containerRef = useRef(null)

  const filtered = useMemo(() => {
    if (!query) return ALL_TIMEZONES
    const q = query.toLowerCase()
    return ALL_TIMEZONES.filter(tz => tz.toLowerCase().includes(q))
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll selected into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]')
      if (selected) selected.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  const handleSelect = (tz) => {
    onChange(tz)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open) setTimeout(() => inputRef.current?.focus(), 0) }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm border border-border bg-background text-foreground hover:border-primary/50 transition-colors"
      >
        <span>{value}</span>
        <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search timezones…"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <ul ref={listRef} className="max-h-48 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">No timezones found</li>
            )}
            {filtered.map(tz => (
              <li
                key={tz}
                data-selected={tz === value}
                onClick={() => handleSelect(tz)}
                className={cn(
                  'px-3 py-1.5 text-sm cursor-pointer transition-colors',
                  tz === value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                {tz}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [heartbeat, setHeartbeat] = useState('30m')
  const [savedHeartbeat, setSavedHeartbeat] = useState('30m')
  const [timezone, setTimezoneLocal] = useState('UTC')
  const [savedTimezone, setSavedTimezone] = useState('UTC')
  const [maxConcurrent, setMaxConcurrent] = useState(1)
  const [savedMaxConcurrent, setSavedMaxConcurrent] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [error, setError] = useState(null)
  const { setTimezone: setGlobalTimezone } = useTimezone()

  const [versionInfo, setVersionInfo] = useState(null)
  const [versionChecking, setVersionChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateResult, setUpdateResult] = useState(null)

  const [vidclawInfo, setVidclawInfo] = useState(null)
  const [vidclawLoading, setVidclawLoading] = useState(true)
  const [vidclawUpdating, setVidclawUpdating] = useState(false)
  const [vidclawUpdateResult, setVidclawUpdateResult] = useState(null)
  const [refreshCountdown, setRefreshCountdown] = useState(null)

  const isDirty = heartbeat !== savedHeartbeat || timezone !== savedTimezone || maxConcurrent !== savedMaxConcurrent

  useEffect(() => {
    fetch('api/settings')
      .then(r => r.json())
      .then(d => {
        setHeartbeat(d.heartbeatEvery || '30m')
        setSavedHeartbeat(d.heartbeatEvery || '30m')
        const tz = d.timezone || 'UTC'
        setTimezoneLocal(tz)
        setSavedTimezone(tz)
        const mc = d.maxConcurrent || 1
        setMaxConcurrent(mc)
        setSavedMaxConcurrent(mc)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    fetch('api/vidclaw/version')
      .then(r => r.json())
      .then(d => { setVidclawInfo(d); setVidclawLoading(false) })
      .catch(() => setVidclawLoading(false))
  }, [])

  const checkOpenclawVersion = async () => {
    setVersionChecking(true)
    try {
      const r = await fetch('api/openclaw/version')
      const d = await r.json()
      setVersionInfo(d)
    } catch {
      setVersionInfo(null)
    } finally {
      setVersionChecking(false)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setUpdateResult(null)
    try {
      const r = await fetch('api/openclaw/update', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Update failed')
      setUpdateResult({ success: true, version: data.version })
      setVersionInfo(v => ({ ...v, current: data.version, outdated: false }))
    } catch (e) {
      setUpdateResult({ success: false, error: e.message })
    } finally {
      setUpdating(false)
    }
  }

  const handleVidclawUpdate = async () => {
    setVidclawUpdating(true)
    setVidclawUpdateResult(null)
    try {
      const r = await fetch('api/vidclaw/update', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Update failed')
      setVidclawUpdateResult({ success: true, version: data.version })
      setVidclawInfo(v => ({ ...v, current: data.version, outdated: false }))
      setRefreshCountdown(5)
      const interval = setInterval(() => {
        setRefreshCountdown(prev => {
          if (prev <= 1) { clearInterval(interval); window.location.reload(); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (e) {
      setVidclawUpdateResult({ success: false, error: e.message })
    } finally {
      setVidclawUpdating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch('api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ heartbeatEvery: heartbeat, timezone, maxConcurrent }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error || 'Save failed')
      }
      const data = await r.json()
      setSavedHeartbeat(heartbeat)
      setSavedTimezone(timezone)
      setSavedMaxConcurrent(maxConcurrent)
      setGlobalTimezone(timezone)
      setSaved(true)
      setRestarted(!!data.restarted)
      setTimeout(() => { setSaved(false); setRestarted(false) }, 2000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageSkeleton variant="settings" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={20} className="text-primary" />
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* Heartbeat Section */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-orange-400" />
          <h3 className="font-medium text-sm">Heartbeat Frequency</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          How often the agent checks in. Lower values mean faster responses but more API usage.
        </p>
        <div className="flex flex-wrap gap-2">
          {HEARTBEAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setHeartbeat(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm border transition-colors',
                heartbeat === opt.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone Section */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-blue-400" />
          <h3 className="font-medium text-sm">Timezone</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Used for the clock display, calendar dates, and task timestamps. No restart needed.
        </p>
        <TimezoneCombobox value={timezone} onChange={setTimezoneLocal} />
      </div>

      {/* Concurrent Tasks */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-purple-400" />
          <h3 className="font-medium text-sm">Concurrent Tasks</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Maximum tasks the agent can work on simultaneously via sub-agents.
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <button
              key={n}
              onClick={() => setMaxConcurrent(n)}
              className={cn(
                'w-9 h-9 rounded-md text-sm font-medium border transition-colors',
                maxConcurrent === n
                  ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                  : 'border-border text-muted-foreground hover:border-purple-500/50 hover:text-foreground'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* OpenClaw Version */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-green-400" />
          <h3 className="font-medium text-sm">OpenClaw Version</h3>
        </div>
        {!versionInfo ? (
          <button
            onClick={checkOpenclawVersion}
            disabled={versionChecking}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {versionChecking ? <Loader2 className="animate-spin" size={14} /> : <Package size={14} />}
            {versionChecking ? 'Checking…' : 'Check for updates'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Installed:</span>
              <span className="font-mono">{versionInfo.current || 'unknown'}</span>
              {versionInfo.latest && (
                <>
                  <span className="text-muted-foreground">Latest:</span>
                  <span className="font-mono">{versionInfo.latest}</span>
                </>
              )}
              {versionInfo.outdated === true && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Update available
                </span>
              )}
              {versionInfo.outdated === false && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                  Up to date
                </span>
              )}
            </div>
            {versionInfo.outdated && (
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updating ? <Loader2 className="animate-spin" size={14} /> : <Package size={14} />}
                {updating ? 'Updating…' : `Update to v${versionInfo.latest}`}
              </button>
            )}
            {updateResult?.success && (
              <p className="text-xs text-green-400">Updated to v{updateResult.version}. OpenClaw is restarting…</p>
            )}
            {updateResult && !updateResult.success && (
              <p className="text-xs text-red-400">Update failed: {updateResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* VidClaw Version */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-400" />
          <h3 className="font-medium text-sm">VidClaw Version</h3>
        </div>
        {vidclawLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="animate-spin" size={14} /> Checking version…
          </div>
        ) : !vidclawInfo || (!vidclawInfo.current && !vidclawInfo.latest) ? (
          <p className="text-xs text-muted-foreground">Could not check version</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Installed:</span>
              <span className="font-mono">{vidclawInfo.current || 'unknown'}</span>
              {vidclawInfo.latest && (
                <>
                  <span className="text-muted-foreground">Latest:</span>
                  <span className="font-mono">{vidclawInfo.latest}</span>
                </>
              )}
              {vidclawInfo.outdated === true && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Update available
                </span>
              )}
              {vidclawInfo.outdated === false && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                  Up to date
                </span>
              )}
            </div>
            {vidclawInfo.outdated && (
              <button
                onClick={handleVidclawUpdate}
                disabled={vidclawUpdating}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {vidclawUpdating ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                {vidclawUpdating ? 'Updating…' : `Update to v${vidclawInfo.latest}`}
              </button>
            )}
            {vidclawUpdateResult?.success && (
              <p className="text-xs text-green-400">
                Updated to v{vidclawUpdateResult.version}.{' '}
                <a onClick={() => window.location.reload()} className="underline cursor-pointer hover:text-green-300">Refresh now</a>
                {' '}or auto-refresh in {refreshCountdown}s…
              </p>
            )}
            {vidclawUpdateResult && !vidclawUpdateResult.success && (
              <p className="text-xs text-red-400">Update failed: {vidclawUpdateResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            isDirty
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? 'Saving…' : saved ? (restarted ? 'Saved & Restarting' : 'Saved') : 'Save'}
        </button>
        {saved && restarted && (
          <span className="text-xs text-green-400">OpenClaw is restarting with new settings…</span>
        )}
        {saved && !restarted && (
          <span className="text-xs text-green-400">Settings saved.</span>
        )}
      </div>
    </div>
  )
}
