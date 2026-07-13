import "@/core/i18n/config";
import { Theme } from "@astryxdesign/core/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import { klyntTheme } from "@/app/theme/klynt-theme";
import { createQueryClient } from "@/core/api/api-module";
import { AuthHydrator } from "@/core/auth";
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
    // mode is pinned to "light" on purpose: the legacy shadcn layer has no working dark mode
    // (nothing applies the `.dark` class), so mode="system" would render Astryx components dark
    // inside a hard-light app on an OS in dark mode. Switch to "system" once the migration adds
    // a real theme control that drives this prop. See docs/astryx-migration-plan.md.
    <Theme theme={klyntTheme} mode="light">
      <HelmetProvider>
        <I18nextProvider i18n={i18n}>
          <HtmlLang />
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthHydrator>{children}</AuthHydrator>
              <ToastContainer />
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </ErrorBoundary>
        </I18nextProvider>
      </HelmetProvider>
    </Theme>
  );
}
