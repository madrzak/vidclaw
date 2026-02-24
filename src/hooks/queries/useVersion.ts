import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useVidclawVersion() {
  return useQuery({
    queryKey: ["version", "vidclaw"],
    queryFn: () => api.version.vidclaw(),
  })
}

export function useOpenclawVersion(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["version", "openclaw"],
    queryFn: () => api.version.openclaw(),
    enabled: opts?.enabled,
  })
}

export function useUpdateVidclaw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.version.updateVidclaw(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["version", "vidclaw"] }),
  })
}

export function useUpdateOpenclaw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.version.updateOpenclaw(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["version", "openclaw"] }),
  })
}
