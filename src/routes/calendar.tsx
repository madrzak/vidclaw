import { createFileRoute } from "@tanstack/react-router"
import CalendarView from "@/components/Calendar/CalendarView"

export const Route = createFileRoute("/calendar")({
  component: CalendarView,
})
