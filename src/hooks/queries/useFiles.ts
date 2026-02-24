import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useFiles(path?: string) {
  return useQuery({
    queryKey: ["files", path ?? ""],
    queryFn: () => api.files.list(path),
  })
}

export function useFileContent(path: string | null) {
  return useQuery({
    queryKey: ["files", "content", path],
    queryFn: () => api.files.content(path!),
    enabled: !!path,
  })
}

export function useUpdateFileContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      api.files.save(path, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (path: string) => api.files.delete(path),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  })
}
