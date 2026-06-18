import { createQueryClient } from "@/core/api/query-client";
import { ErrorBoundary } from "@/core/error-boundary";
import { ToastContainer } from "@/core/notifications/toast-container";
import { useToastStore } from "@/core/notifications/toast-store";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const addToast = useToastStore((state) => state.addToast);
  const [queryClient] = useState(() =>
    createQueryClient({
      onMutationError: (error, mutation) => {
        if ((mutation.meta as { suppressToast?: boolean } | undefined)?.suppressToast) {
          return;
        }
        addToast({ message: error.message, type: "error", duration: 5000 });
      },
    })
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
