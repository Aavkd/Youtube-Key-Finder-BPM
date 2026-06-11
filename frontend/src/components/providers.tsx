"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { AuthGate } from "@/components/auth-gate";
import { JobsStream } from "@/components/jobs-stream";

/**
 * Client-side providers (D34): TanStack Query for server state + next-themes
 * for the dark (default) / light toggle that persists across reloads (D28).
 * next-intl's provider lives in the root layout (server) so messages resolve
 * from the request locale.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 10_000,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <JobsStream />
          {children}
        </AuthGate>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
