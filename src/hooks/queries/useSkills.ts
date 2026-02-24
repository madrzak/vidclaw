import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => api.skills.list(),
  })
}

export function useSkillContent(id: string | null) {
  return useQuery({
    queryKey: ["skills", id, "content"],
    queryFn: () => api.skills.content(id!),
    enabled: !!id,
  })
}

export function useToggleSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled?: boolean }) =>
      api.skills.toggle(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  })
}

export function useCreateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; instructions?: string }) =>
      api.skills.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  })
}

export function useDeleteSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.skills.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  })
}
