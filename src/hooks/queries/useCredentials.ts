import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useCredentials() {
  return useQuery({
    queryKey: ["credentials"],
    queryFn: () => api.credentials.list(),
  })
}

export function useSaveCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      name,
      value,
      type,
      fileName,
    }: {
      name: string
      value: string
      type?: string
      fileName?: string
    }) => api.credentials.save(name, { value, type, fileName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  })
}

export function useDeleteCredential() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.credentials.delete(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  })
}
