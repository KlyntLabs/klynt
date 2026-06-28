import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("CookieBanner interactions", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      writable: true,
    });
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
        expect(localStorage.setItem).toHaveBeenCalledWith("cookie-dismissed", "true");
      },
      { timeout: 1000 }
    );
  }, 10000);

  it("does not show the banner when it has already been dismissed", async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("true");
    render(<CookieBanner />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /dismiss cookie banner/i })
      ).not.toBeInTheDocument();
    });
  });
});
