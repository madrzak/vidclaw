import { createFileRoute } from "@tanstack/react-router"
import SettingsPage from "@/components/Settings/SettingsPage"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})
