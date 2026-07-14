import "@/core/i18n/config";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { useToast } from "@astryxdesign/core/Toast";
import { Theme } from "@astryxdesign/core/theme";
// The PRE-BUILT theme, not the source one. Importing from "@astryxdesign/theme-neutral" makes
// Astryx inject the theme's styles at runtime on every load and warn about it in the console
// ("Theme 'neutral' is using runtime style injection"); the /built entry ships the compiled
// artifact instead, and its stylesheet is already imported in index.css.
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import { createQueryClient } from "@/core/api/api-module";
import { AuthHydrator } from "@/core/auth";
import { ErrorBoundary } from "@/core/error-boundary";
import i18n from "@/core/i18n/config";
import { HtmlLang } from "@/core/i18n/html-lang";
import { useThemeStore } from "@/core/theme/theme-store";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Owns the query client, and with it the one toast that is not raised by a call site: the
 * fallback error toast for any mutation that has not opted out with `meta.suppressToast`.
 *
 * It is a separate component because `useToast` has to be called from *inside* `LayerProvider` —
 * calling it in the component that renders the provider would read a null `ToastContext` and
 * make Astryx lazily self-mount a second, fallback viewport (it warns about exactly this). The
 * function `useToast` returns is stable, so capturing it in the `useState` initialiser is safe.
 */
function QueryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [queryClient] = useState(() =>
    createQueryClient({
      onMutationError: (error, mutation) => {
        if ((mutation.meta as { suppressToast?: boolean } | undefined)?.suppressToast) {
          return;
        }
        toast({ body: error.message, type: "error", isAutoHide: true, autoHideDuration: 5000 });
      },
    })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function AppProviders({ children }: AppProvidersProps) {
  const themeMode = useThemeStore((state) => state.mode);

  return (
    // `mode` was pinned to "light" for the whole migration, because the legacy Tailwind layer
    // had no working dark mode — nothing ever applied the `.dark` class — so "system" would
    // have rendered Astryx components dark inside a hard-light app on a dark-mode machine.
    //
    // Tailwind is gone and every surface is Astryx, so the pin is lifted: the theme store now
    // drives it, defaulting to "system", with ThemeToggle as the control. Astryx syncs
    // `data-theme` onto <html> from this prop, which is also what portalled content (dialogs,
    // popovers, toasts) reads to resolve its light-dark() tokens.
    //
    // The theme is Astryx's STOCK neutralTheme — no defineTheme, no accent, no token overrides.
    // The app is 100% native to the design system, which means the accent is Astryx's
    // near-black/near-white (#262626 / #ebebeb), not the Klynt orange. There is deliberately
    // nowhere left to put a brand colour: reintroducing one means reintroducing defineTheme.
    <Theme theme={neutralTheme} mode={themeMode}>
      {/*
       * The toast layer. `LayerProvider` mounts Astryx's `ToastViewport` around the app, which
       * is what `useToast()` feeds from anywhere in the tree — it owns the stack, the corner,
       * the enter/exit animation, the auto-dismiss timer (paused on hover and focus), the
       * dedup, and the live region.
       *
       * It replaces a hand-rolled zustand store plus a `position: fixed` container that carried
       * a raw `z-index: 50` — the app's last stacking-order integer. The viewport does not
       * stack by z-index at all: it promotes itself into the CSS *top layer* via
       * `popover="manual"`, so it is above the desktop's window manager and above dialogs by
       * construction, and there is no number left to pick. Defaults are taken as-is (bottomEnd,
       * 5 visible), which is where the old container sat.
       */}
      <LayerProvider>
        <HelmetProvider>
          <I18nextProvider i18n={i18n}>
            <HtmlLang />
            <ErrorBoundary>
              <QueryProvider>
                <AuthHydrator>{children}</AuthHydrator>
                <ReactQueryDevtools initialIsOpen={false} />
              </QueryProvider>
            </ErrorBoundary>
          </I18nextProvider>
        </HelmetProvider>
      </LayerProvider>
    </Theme>
  );
}
