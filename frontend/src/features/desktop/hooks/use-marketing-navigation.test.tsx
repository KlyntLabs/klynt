import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { resetDesktopStore } from "@/features/desktop/test-helpers";
import { useMarketingNavigation } from "./use-marketing-navigation";

function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function useTestLocation() {
  return useLocation();
}

describe("useMarketingNavigation", () => {
  it("opens a window in desktop mode", () => {
    resetDesktopStore();

    const { result } = renderHook(() => useMarketingNavigation(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.goTo("/pricing");
    });

    const state = useDesktopStore.getState();
    expect(state.windows.marketing).toHaveLength(1);
    expect(state.windows.marketing?.[0]?.appId).toBe("pricing");
  });

  it("navigates via React Router in website mode", () => {
    resetDesktopStore();
    useDesktopStore.setState({ viewMode: "website" });

    const { result } = renderHook(
      () => ({ nav: useMarketingNavigation(), location: useTestLocation() }),
      {
        wrapper: Wrapper,
      }
    );

    act(() => {
      result.current.nav.goTo("/pricing");
    });

    expect(useDesktopStore.getState().windows.marketing).toBeUndefined();
    expect(result.current.location.pathname).toBe("/pricing");
  });

  it("goes to the home route", () => {
    resetDesktopStore();

    const { result } = renderHook(() => useMarketingNavigation(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.goToHome();
    });

    const state = useDesktopStore.getState();
    expect(state.windows.marketing).toHaveLength(1);
    expect(state.windows.marketing?.[0]?.appId).toBe("home");
  });
});
