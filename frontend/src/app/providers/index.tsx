import "@/core/i18n/config";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import { createQueryClient } from "@/core/api/query-client";
import { ErrorBoundary } from "@/core/error-boundary";
import i18n from "@/core/i18n/config";
import { HtmlLang } from "@/core/i18n/html-lang";
import { ToastContainer } from "@/core/notifications/toast-container";
import { useToastStore } from "@/core/notifications/toast-store";

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
    <HelmetProvider>
      <I18nextProvider i18n={i18n}>
        <HtmlLang />
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            {children}
            <ToastContainer />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nextProvider>
    </HelmetProvider>
  );
}
