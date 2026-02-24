import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useCalendar() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => api.calendar.get(),
  })
}
