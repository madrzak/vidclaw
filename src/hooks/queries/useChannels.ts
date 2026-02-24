import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => api.channels.list(),
  })
}
