import { StrictMode, lazy, Suspense } from "react"
import ReactDOM from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { ThemeProvider } from "./components/ThemeContext"
import { SocketProvider } from "./hooks/useSocket"
import { TimezoneProvider } from "./components/TimezoneContext"
import { routeTree } from "./routeTree.gen"
import "./styles.css"

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools/production").then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : () => null

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      }))
    )
  : () => null

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SocketProvider>
          <TimezoneProvider>
            <RouterProvider router={router} />
            <Suspense>
              <ReactQueryDevtools buttonPosition="bottom-left" />
              <TanStackRouterDevtools router={router} position="bottom-right" />
            </Suspense>
          </TimezoneProvider>
        </SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
