import "@/core/i18n/config";
import { LinkProvider } from "@astryxdesign/core/Link";
import { Theme } from "@astryxdesign/core/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import { RouterLink } from "@/app/router-link";
import { createQueryClient } from "@/core/api/api-module";
import { AuthHydrator } from "@/core/auth";
import { ErrorBoundary } from "@/core/error-boundary";
import i18n from "@/core/i18n/config";
import { HtmlLang } from "@/core/i18n/html-lang";
import { ToastContainer } from "@/core/notifications/toast-container";
import { useToastStore } from "@/core/notifications/toast-store";
import { klyntTheme } from "@/theme/klynt-theme";

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
            <AuthHydrator>
              <Theme theme={klyntTheme} mode="system">
                <LinkProvider component={RouterLink}>{children}</LinkProvider>
              </Theme>
            </AuthHydrator>
            <ToastContainer />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ErrorBoundary>
      </I18nextProvider>
    </HelmetProvider>
  );
}
