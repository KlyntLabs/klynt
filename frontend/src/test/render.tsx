import i18n from "@/core/i18n/test-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";

interface RenderOptions {
  initialEntries?: MemoryRouterProps["initialEntries"];
}

export function render(ui: React.ReactElement, options: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return rtlRender(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter {...options}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
