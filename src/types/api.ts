export interface Attachment {
  name: string
  filename: string
  mimeType: string
  size: number
  addedAt: string
}

export interface RunHistoryEntry {
  completedAt: string
  startedAt: string | null
  result: string | null
  error: string | null
}

export interface Task {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  skill: string
  skills: string[]
  status: "backlog" | "todo" | "in-progress" | "done" | "archived"
  createdAt: string
  updatedAt: string
  completedAt: string | null
  schedule: string | null
  scheduledAt: string | null
  scheduleEnabled: boolean
  runHistory: RunHistoryEntry[]
  result: string | null
  startedAt: string | null
  error: string | null
  channel: string | null
  order: number
  source: string | null
  sourceMessageId: string | null
  subagentId: string | null
  pickedUp: boolean
  attachments: Attachment[]
  previousStatus: string | null
  archivedAt: string | null
}

export interface CreateTaskRequest {
  title: string
  description?: string
  priority?: "low" | "medium" | "high"
  skill?: string
  skills?: string[]
  status?: "backlog" | "todo" | "in-progress" | "done"
  schedule?: string | null
  scheduledAt?: string | null
  channel?: string | null
  source?: string | null
  sourceMessageId?: string | null
  order?: number
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: string
  skill?: string
  skills?: string[]
  status?: string
  schedule?: string | null
  scheduledAt?: string | null
  scheduleEnabled?: boolean
  result?: string | null
  startedAt?: string | null
  completedAt?: string | null
  error?: string | null
  order?: number
  subagentId?: string | null
  channel?: string | null
  source?: string | null
  sourceMessageId?: string | null
  _actor?: string
}

export interface Capacity {
  maxConcurrent: number
  activeCount: number
  remainingSlots: number
}

export interface Skill {
  id: string
  name: string
  description: string
  source: "bundled" | "managed" | "workspace"
  enabled: boolean
  path?: string
}

export interface FileEntry {
  name: string
  isDirectory: boolean
  path: string
  size: number
  mtime: string
}

export interface Settings {
  heartbeatEvery: string
  timezone: string
  maxConcurrent: number
  defaultFilePath: string
}

export interface Credential {
  name: string
  exists: boolean
  type: "text" | "file"
  fileName?: string
  modifiedAt: string
}

export interface UsageTier {
  label: string
  percent: number
  resetsIn: string
  tokens: number
  cost: number
}

export interface UsageData {
  model: string
  timezone: string
  tiers: UsageTier[]
  details: {
    today: { tokens: number; cost: number; sessions: number }
    week: { tokens: number; cost: number; sessions: number }
    month: { tokens: number; cost: number; sessions: number }
  }
}

export interface CalendarDayEntry {
  memory: boolean | string
  tasks: string[]
  scheduled: Array<{ id: string; title: string }>
}

export type CalendarData = Record<string, CalendarDayEntry>

export interface ActivityEntry {
  id: string
  timestamp: string
  actor: "user" | "bot" | "system" | "dashboard"
  action: string
  details: Record<string, unknown>
}

export interface VersionInfo {
  current: string | null
  currentError?: string
  latest: string | null
  latestError?: string
  outdated: boolean | null
}

export interface Channel {
  id: string
  label: string
  icon: string
}

export interface Session {
  id: string
  label: string | null
  channel: string | null
  model: string | null
  size: number
  firstTs: string | null
  lastTs: string | null
  messageCount: number
  totalTokens: number
  totalCost: number
}

export interface SessionList {
  sessions: Session[]
  total: number
  offset: number
  limit: number
}

export interface SessionMessage {
  id: string
  role: string
  timestamp: string
  contentPreview: string
  usage?: Record<string, unknown>
}

export interface SessionDetail {
  id: string
  entries: number
  messages: SessionMessage[]
}

export interface MemoryFile {
  name: string
  path: string
  size: number
  mtime: string
  isDaily: boolean
  ageHours: number
  health: "fresh" | "aging" | "stale"
}

export interface HistoryEntry {
  content: string
  timestamp: string
}

export interface SoulTemplate {
  name: string
  content: string
}
