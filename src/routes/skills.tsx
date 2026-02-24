import { createFileRoute } from "@tanstack/react-router"
import SkillsManager from "@/components/Skills/SkillsManager"

export const Route = createFileRoute("/skills")({
  component: SkillsManager,
})
