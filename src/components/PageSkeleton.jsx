import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {[1, 2, 3, 4].map(col => (
        <div key={col} className="flex-1 min-w-[260px] flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: col === 1 ? 3 : col === 4 ? 4 : 2 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-card/50">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex justify-end mb-2">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h${i}`} className="h-5 mx-auto w-8" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function FilesSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border border-border rounded-xl bg-card/50 overflow-hidden flex-1">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-20" />
          <div className="ml-auto">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex-1 divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1 max-w-[200px]" />
              <Skeleton className="h-3 w-16 hidden sm:block" />
              <Skeleton className="h-3 w-12 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkillsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card/50 border border-border rounded-lg p-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 flex-1 min-w-[200px] rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-border rounded-lg p-4 flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SoulSkeleton() {
  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex gap-1 bg-card rounded-lg p-1 w-fit">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
      </div>
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <Skeleton className="flex-1 rounded-lg" />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-7 w-16 rounded-md" />
            </div>
          </div>
        </div>
        <div className="w-72 shrink-0 rounded-lg border border-border bg-card">
          <div className="flex border-b border-border p-2 gap-2">
            <Skeleton className="h-7 flex-1 rounded-md" />
            <Skeleton className="h-7 flex-1 rounded-md" />
          </div>
          <div className="p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MemorySkeleton() {
  return (
    <div className="flex gap-4 h-full">
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-3" />
        </div>
        <Skeleton className="h-14 w-full rounded-md" />
        <div className="pt-2 border-t border-border mt-2 space-y-1">
          <Skeleton className="h-3 w-20 mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
        <Skeleton className="flex-1 rounded-md" />
      </div>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-20" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          {i === 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-24 rounded-md" />
              ))}
            </div>
          )}
          {i === 1 && <Skeleton className="h-9 w-full rounded-md" />}
          {i >= 2 && (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-36 rounded-md" />
            </div>
          )}
        </div>
      ))}
      <Skeleton className="h-9 w-20 rounded-md" />
    </div>
  )
}

function CredentialsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

const variants = {
  kanban: KanbanSkeleton,
  calendar: CalendarSkeleton,
  files: FilesSkeleton,
  skills: SkillsSkeleton,
  soul: SoulSkeleton,
  memory: MemorySkeleton,
  settings: SettingsSkeleton,
  credentials: CredentialsSkeleton,
}

export default function PageSkeleton({ variant, text = 'Loading…' }) {
  const VariantComponent = variants[variant]

  if (VariantComponent) {
    return <VariantComponent />
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  )
}
