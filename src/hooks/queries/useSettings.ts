import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Settings } from "@/types/api"

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get(),
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Settings>) => api.settings.save(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  })
}
