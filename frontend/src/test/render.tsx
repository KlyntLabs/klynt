import { render as rtlRender } from "@testing-library/react";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";
import { AppProviders } from "@/app/providers";

interface RenderOptions {
  initialEntries?: MemoryRouterProps["initialEntries"];
}

export function render(ui: React.ReactElement, options: RenderOptions = {}) {
  return rtlRender(
    <AppProviders>
      <MemoryRouter {...options}>{ui}</MemoryRouter>
    </AppProviders>
  );
}
