import { createFileRoute } from "@tanstack/react-router"
import Board from "@/components/Kanban/Board"

export const Route = createFileRoute("/kanban")({
  component: () => <Board />,
})
