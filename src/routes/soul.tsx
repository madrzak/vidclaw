import { createFileRoute } from "@tanstack/react-router"
import SoulEditor from "@/components/Soul/SoulEditor"

export const Route = createFileRoute("/soul")({
  component: SoulEditor,
})
