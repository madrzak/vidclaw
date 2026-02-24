import { createFileRoute } from "@tanstack/react-router"
import CredentialsManager from "@/components/Credentials/CredentialsManager"

export const Route = createFileRoute("/credentials")({
  component: CredentialsManager,
})
