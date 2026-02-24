import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useSoulFile(name?: string) {
  const isSoul = !name || name === "SOUL.md"
  return useQuery({
    queryKey: isSoul ? ["soul"] : ["workspace-file", name],
    queryFn: () => (isSoul ? api.soul.get() : api.workspaceFile.get(name!)),
  })
}

export function useSoulHistory(name?: string) {
  const isSoul = !name || name === "SOUL.md"
  return useQuery({
    queryKey: isSoul ? ["soul", "history"] : ["workspace-file", name, "history"],
    queryFn: () => (isSoul ? api.soul.history() : api.workspaceFile.history(name!)),
  })
}

export function useSoulTemplates() {
  return useQuery({
    queryKey: ["soul", "templates"],
    queryFn: () => api.soul.templates(),
  })
}

export function useSaveSoul() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, content }: { name?: string; content: string }) => {
      const isSoul = !name || name === "SOUL.md"
      return isSoul ? api.soul.save(content) : api.workspaceFile.save(name!, content)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soul"] })
      qc.invalidateQueries({ queryKey: ["workspace-file"] })
    },
  })
}

export function useRevertSoul() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (index: number) => api.soul.revert(index),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["soul"] })
    },
  })
}
