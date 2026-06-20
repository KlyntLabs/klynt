import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { render } from "@/test/render";
import CookieBanner from "./CookieBanner";

function createStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

function resetStore() {
  useDesktopStore.setState({
    viewMode: "desktop",
    windows: [],
    activeWindowId: null,
    cookieDismissed: false,
    nextZIndex: 100,
  });
}

describe("CookieBanner interactions", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      writable: true,
    });
    resetStore();
  });

  it("shows the banner after the entrance delay and dismisses it", async () => {
    render(<CookieBanner />);

    expect(
      screen.queryByRole("button", { name: /dismiss cookie banner/i })
    ).not.toBeInTheDocument();

    const dismissButton = await screen.findByRole(
      "button",
      { name: /dismiss cookie banner/i },
      { timeout: 2500 }
    );
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /dismiss cookie banner/i })
      ).not.toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(useDesktopStore.getState().cookieDismissed).toBe(true);
      },
      { timeout: 1000 }
    );

    expect(localStorage.setItem).toHaveBeenCalledWith("cookie-dismissed", "true");
  }, 10000);

  it("does not show the banner when it has already been dismissed", async () => {
    useDesktopStore.setState({ cookieDismissed: true });
    render(<CookieBanner />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /dismiss cookie banner/i })
      ).not.toBeInTheDocument();
    });
  });
});
