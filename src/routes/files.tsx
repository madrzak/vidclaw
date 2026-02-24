import { createFileRoute } from "@tanstack/react-router"
import FileBrowser from "@/components/Content/FileBrowser"

interface FilesSearch {
  openFile?: string
}

export const Route = createFileRoute("/files")({
  validateSearch: (search: Record<string, unknown>): FilesSearch => ({
    openFile: typeof search.openFile === "string" ? search.openFile : undefined,
  }),
  component: FileBrowser,
})
