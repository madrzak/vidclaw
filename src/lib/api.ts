import type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  Capacity,
  Skill,
  FileEntry,
  Settings,
  Credential,
  UsageData,
  CalendarData,
  ActivityEntry,
  Attachment,
  VersionInfo,
  Channel,
  MemoryFile,
  SessionList,
  SessionDetail,
  HistoryEntry,
  SoulTemplate,
} from "@/types/api"

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

function post<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: body != null ? { "Content-Type": "application/json" } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  })
}

function put<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function del<T>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" })
}

export const api = {
  tasks: {
    list: (opts?: { includeArchived?: boolean; channel?: string }) => {
      const params = new URLSearchParams()
      if (opts?.includeArchived) params.set("includeArchived", "true")
      if (opts?.channel) params.set("channel", opts.channel)
      const qs = params.toString()
      return request<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`)
    },
    create: (data: CreateTaskRequest) => post<Task>("/api/tasks", data),
    update: (id: string, data: UpdateTaskRequest) => put<Task>(`/api/tasks/${id}`, data),
    delete: (id: string) => del<{ ok: true }>(`/api/tasks/${id}`),
    reorder: (status: string, order: string[]) =>
      post<{ ok: true }>("/api/tasks/reorder", { status, order }),
    run: (id: string) => post<{ success: true; message: string }>(`/api/tasks/${id}/run`),
    capacity: () => request<Capacity>("/api/tasks/capacity"),
    scheduleToggle: (id: string, enabled?: boolean) =>
      post<Task>(`/api/tasks/${id}/schedule-toggle`, { enabled }),
    bulkDelete: (opts: { status?: string; ids?: string[] }) =>
      post<{ ok: true; archived: number }>("/api/tasks/bulk-delete", opts),
    attachments: {
      list: (taskId: string) => request<Attachment[]>(`/api/tasks/${taskId}/attachments`),
      upload: async (taskId: string, file: File) => {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          body: form,
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json() as Promise<Attachment>
      },
      delete: (taskId: string, filename: string) =>
        del<{ ok: true }>(`/api/tasks/${taskId}/attachments/${encodeURIComponent(filename)}`),
    },
  },

  skills: {
    list: () => request<Skill[]>("/api/skills"),
    toggle: (id: string, enabled?: boolean) =>
      post<Skill>(`/api/skills/${id}/toggle`, { enabled }),
    create: (data: { name: string; description?: string; instructions?: string }) =>
      post<Skill>("/api/skills/create", data),
    content: (id: string) => request<{ content: string }>(`/api/skills/${id}/content`),
    delete: (id: string) => del<{ ok: true }>(`/api/skills/${id}`),
  },

  files: {
    list: (path?: string) => {
      const params = path ? `?path=${encodeURIComponent(path)}` : ""
      return request<FileEntry[]>(`/api/files${params}`)
    },
    content: (path: string) =>
      request<{ content: string; path: string }>(`/api/files/content?path=${encodeURIComponent(path)}`),
    save: (path: string, content: string) =>
      put<{ success: true }>("/api/files/content", { path, content }),
    delete: (path: string) =>
      del<{ success: true }>(`/api/files?path=${encodeURIComponent(path)}`),
  },

  soul: {
    get: () => request<{ content: string; lastModified: string | null }>("/api/soul"),
    save: (content: string) => put<{ success: true }>("/api/soul", { content }),
    history: () => request<HistoryEntry[]>("/api/soul/history"),
    revert: (index: number) =>
      post<{ success: true; content: string }>("/api/soul/revert", { index }),
    templates: () => request<SoulTemplate[]>("/api/soul/templates"),
  },

  workspaceFile: {
    get: (name: string) =>
      request<{ content: string; lastModified: string | null }>(
        `/api/workspace-file?name=${encodeURIComponent(name)}`
      ),
    save: (name: string, content: string) =>
      put<{ success: true }>(`/api/workspace-file?name=${encodeURIComponent(name)}`, { content }),
    history: (name: string) =>
      request<HistoryEntry[]>(`/api/workspace-file/history?name=${encodeURIComponent(name)}`),
  },

  memory: {
    files: () => request<MemoryFile[]>("/api/memory/files"),
    file: (path: string) =>
      request<{ content: string; lastModified: string | null }>(
        `/api/memory/file?path=${encodeURIComponent(path)}`
      ),
    saveFile: (path: string, content: string) =>
      put<{ success: true }>(`/api/memory/file?path=${encodeURIComponent(path)}`, { content }),
    sessions: (opts?: { limit?: number; offset?: number }) => {
      const params = new URLSearchParams()
      if (opts?.limit != null) params.set("limit", String(opts.limit))
      if (opts?.offset != null) params.set("offset", String(opts.offset))
      const qs = params.toString()
      return request<SessionList>(`/api/memory/sessions${qs ? `?${qs}` : ""}`)
    },
    session: (id: string) => request<SessionDetail>(`/api/memory/sessions/${id}`),
  },

  settings: {
    get: () => request<Settings>("/api/settings"),
    save: (data: Partial<Settings>) =>
      post<{ ok: true; restarted?: boolean }>("/api/settings", data),
  },

  credentials: {
    list: () => request<Credential[]>("/api/credentials"),
    save: (name: string, data: { value: string; type?: string; fileName?: string }) =>
      put<{ ok: true }>(`/api/credentials/${encodeURIComponent(name)}`, data),
    delete: (name: string) => del<{ ok: true }>(`/api/credentials/${encodeURIComponent(name)}`),
  },

  usage: {
    get: () => request<UsageData>("/api/usage"),
    models: () => request<string[]>("/api/models"),
    switchModel: (model: string) => post<{ success: true; model: string }>("/api/model", { model }),
  },

  calendar: {
    get: () => request<CalendarData>("/api/calendar"),
  },

  activity: {
    list: (opts?: { limit?: number; taskId?: string }) => {
      const params = new URLSearchParams()
      if (opts?.limit != null) params.set("limit", String(opts.limit))
      if (opts?.taskId) params.set("taskId", opts.taskId)
      const qs = params.toString()
      return request<ActivityEntry[]>(`/api/activity${qs ? `?${qs}` : ""}`)
    },
  },

  heartbeat: {
    get: () => request<{ lastHeartbeat: number }>("/api/heartbeat"),
    send: () => post<{ lastHeartbeat: number }>("/api/heartbeat"),
  },

  channels: {
    list: () => request<Channel[]>("/api/channels"),
  },

  version: {
    vidclaw: () => request<VersionInfo>("/api/vidclaw/version"),
    openclaw: () => request<VersionInfo>("/api/openclaw/version"),
    updateVidclaw: () => post<{ success: true; version: string }>("/api/vidclaw/update"),
    updateOpenclaw: () => post<{ success: true; version: string }>("/api/openclaw/update"),
  },

  time: () =>
    request<{
      timezone: string
      iso: string
      local: string
      weekday: number
      year: number
      month: number
      day: number
      hour: number
      minute: number
      second: number
    }>("/api/time"),
}
