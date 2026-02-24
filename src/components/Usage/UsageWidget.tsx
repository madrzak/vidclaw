import React, { useState } from 'react'
import { RefreshCw, Zap, ChevronDown, Coins, Hash, Cpu } from 'lucide-react'
import { useUsage, useModels, useSwitchModel } from '@/hooks/queries/useUsage'
import type { UsageTier } from '@/types/api'

interface ProgressBarProps {
  label?: string
  percent: number
  resetsIn: string
  tokens?: number
  cost?: number
}

function formatTokens(n: number | undefined | null): string {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatCost(n: number | undefined | null): string {
  if (!n) return '$0.00'
  return '$' + n.toFixed(2)
}

function ProgressBar({ label, percent, resetsIn, tokens, cost }: ProgressBarProps): React.ReactElement {
  const barColor = percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">Resets {resetsIn}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(1, percent)}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-foreground w-10 text-right">{percent}%</span>
      </div>
      {(tokens != null || cost != null) && (
        <div className="flex gap-3 text-[9px] text-muted-foreground">
          {tokens != null && <span className="flex items-center gap-0.5"><Hash size={8} />{formatTokens(tokens)} tokens</span>}
          {cost != null && <span className="flex items-center gap-0.5"><Coins size={8} />{formatCost(cost)}</span>}
        </div>
      )}
    </div>
  )
}

export default function UsageWidget(): React.ReactElement | null {
  const [expanded, setExpanded] = useState<boolean>(false)
  const [restartNote, setRestartNote] = useState<boolean>(false)

  const { data: usage, isFetching, refetch } = useUsage()
  const { data: models = [] } = useModels()
  const switchModelMutation = useSwitchModel()

  const switchModel = async (model: string): Promise<void> => {
    try {
      await switchModelMutation.mutateAsync(model)
      setRestartNote(true)
    } catch {}
  }

  if (!usage) return null

  const displayModel = (usage.model || 'unknown').replace('anthropic/', '').replace('google/', '')
  const tiers: UsageTier[] = usage.tiers || []
  const sessionPct = tiers[0]?.percent ?? 0

  const pillColor = sessionPct > 80 ? 'text-red-400' : sessionPct > 60 ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 sm:gap-2 bg-secondary/50 hover:bg-secondary/70 rounded-full px-2.5 sm:px-4 py-1.5 text-xs transition-colors"
      >
        <Zap size={12} className="text-orange-400 shrink-0" />
        <span className="hidden sm:inline text-muted-foreground text-[10px]">{displayModel}</span>
        <div className="hidden sm:block w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${sessionPct > 80 ? 'bg-red-500' : sessionPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.max(1, sessionPct)}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${pillColor}`}>{sessionPct}%</span>
        <ChevronDown size={10} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); refetch() }} className="hidden sm:block hover:text-orange-400 transition-colors">
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
        </div>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-card border border-border rounded-lg shadow-xl p-4 z-50 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Active Model</label>
            <div className="flex items-center gap-2">
              <Cpu size={12} className="text-orange-400" />
              <span className="text-sm font-medium text-foreground">{displayModel}</span>
            </div>
            {models.length > 0 && (
              <select
                value={'anthropic/' + usage.model}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => switchModel(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-orange-500 mt-1"
              >
                {models.map((m: string) => (
                  <option key={m} value={m}>{m.replace('anthropic/', '').replace('google/', '')}</option>
                ))}
              </select>
            )}
            {restartNote && (
              <p className="text-[10px] text-green-400">Model updated — takes effect on next session</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Usage</div>
            {tiers.map((tier: UsageTier, i: number) => (
              <ProgressBar key={tier.label || i} {...tier} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
