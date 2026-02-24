import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useActivity(opts?: { limit?: number; taskId?: string }) {
  return useQuery({
    queryKey: ["activity", opts],
    queryFn: () => api.activity.list(opts),
  })
}
