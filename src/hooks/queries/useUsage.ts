import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: () => api.usage.get(),
    refetchInterval: 300_000,
  })
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => api.usage.models(),
  })
}

export function useSwitchModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (model: string) => api.usage.switchModel(model),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usage"] })
      qc.invalidateQueries({ queryKey: ["models"] })
    },
  })
}
