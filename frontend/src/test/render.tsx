import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender } from "@testing-library/react";
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
    <QueryClientProvider client={queryClient}>
      <MemoryRouter {...options}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
