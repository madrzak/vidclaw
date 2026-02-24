import { useQueryClient } from "@tanstack/react-query"
import { useSocket } from "./useSocket"

export function useSocketQueryInvalidation(): void {
  const qc = useQueryClient()

  useSocket("tasks", () => {
    qc.invalidateQueries({ queryKey: ["tasks"] })
  })

  useSocket("settings", () => {
    qc.invalidateQueries({ queryKey: ["settings"] })
    qc.invalidateQueries({ queryKey: ["usage"] })
  })

  useSocket("heartbeat", () => {
    qc.invalidateQueries({ queryKey: ["tasks"] })
  })
}
