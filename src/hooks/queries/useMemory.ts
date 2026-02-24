import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useMemoryFiles() {
  return useQuery({
    queryKey: ["memory", "files"],
    queryFn: () => api.memory.files(),
  })
}

export function useMemoryFile(path: string | null) {
  return useQuery({
    queryKey: ["memory", "file", path],
    queryFn: () => api.memory.file(path!),
    enabled: !!path,
  })
}

export function useSessions(opts?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["memory", "sessions", opts],
    queryFn: () => api.memory.sessions(opts),
  })
}

export function useSessionDetail(id: string | null) {
  return useQuery({
    queryKey: ["memory", "sessions", id],
    queryFn: () => api.memory.session(id!),
    enabled: !!id,
  })
}

export function useSaveMemoryFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      api.memory.saveFile(path, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory"] }),
  })
}
