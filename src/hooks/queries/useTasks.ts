import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { CreateTaskRequest, UpdateTaskRequest } from "@/types/api"

export function useTasks(opts?: { includeArchived?: boolean; channel?: string }) {
  return useQuery({
    queryKey: ["tasks", opts],
    queryFn: () => api.tasks.list(opts),
  })
}

export function useTaskCapacity() {
  return useQuery({
    queryKey: ["tasks", "capacity"],
    queryFn: () => api.tasks.capacity(),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskRequest) => api.tasks.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      api.tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useRunTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.tasks.run(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useReorderTasks() {
  return useMutation({
    mutationFn: ({ status, order }: { status: string; order: string[] }) =>
      api.tasks.reorder(status, order),
  })
}

export function useToggleSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled?: boolean }) =>
      api.tasks.scheduleToggle(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}

export function useBulkDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts: { status?: string; ids?: string[] }) => api.tasks.bulkDelete(opts),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  })
}
