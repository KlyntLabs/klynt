import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import i18n from "@/core/i18n/test-config";
import { server } from "@/test/msw/server";
import { navigateExternal } from "../external-redirect";
import { useLogin } from "./use-login";

vi.mock("../external-redirect", () => ({
  navigateExternal: vi.fn(),
  isExternalUrl: vi.fn(() => true),
  ExternalNavigate: ({ to }: { to: string }) => <div>{to}</div>,
}));

vi.mock("@/core/routing/host-context", () => ({
  getBaseDomain: vi.fn(() => "lvh.me"),
  getHostContext: vi.fn((hostname: string) => {
    const host = hostname.toLowerCase();
    if (host === "lvh.me") return { type: "apex" };
    if (host === "login.lvh.me") return { type: "login" };
    return { type: "unknown", subdomain: host.replace(".lvh.me", "") };
  }),
}));

const originalLocation = window.location;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: {
      host: "login.lvh.me:5174",
      hostname: "login.lvh.me",
      href: "http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers",
      protocol: "http:",
      port: "5174",
      pathname: "/",
      search: "?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers",
      replace: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
  import.meta.env.VITE_APP_PROTOCOL = "http";
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
  import.meta.env.VITE_APP_PROTOCOL = originalProtocol;
  vi.clearAllMocks();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // `LayerProvider` mounts Astryx's ToastViewport, which is what `useToast()` inside the hook
  // feeds. The toast is then asserted on where the user meets it — on screen — because there
  // is no store left to inspect.
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/?from=http://acme.lvh.me:5174/members"]}>
              {children}
            </MemoryRouter>
          </QueryClientProvider>
        </LayerProvider>
      </I18nextProvider>
    );
  };
}

const mockUser = {
  id: "u-1",
  email: "a@b.com",
  full_name: "A",
  role: "student" as const,
  status: "active" as const,
  created_at: "2024-01-01T00:00:00Z",
};

describe("useLogin", () => {
  it("sets session and navigates to the from target", async () => {
    useAuthStore.getState().reset();
    server.use(
      http.post("/api/v1/auth/login", () => HttpResponse.json({ data: { user: mockUser } }))
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ email: "a@b.com", password: "pass" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(navigateExternal).toHaveBeenCalledWith(
      expect.stringContaining("acme.lvh.me:5174/members")
    );
  });

  it("shows a toast on error", async () => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        HttpResponse.json(
          { success: false, code: "unauthorized", error: "Invalid credentials" },
          { status: 401 }
        )
      )
    );

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ email: "a@b.com", password: "pass" });
      })
    ).rejects.toBeDefined();
    await waitFor(() => expect(result.current.isError).toBe(true));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Invalid credentials");
  });
});
