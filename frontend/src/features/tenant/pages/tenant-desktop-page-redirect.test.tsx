import { waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { render } from "@/test/render";
import TenantDesktopPage from "./tenant-desktop-page";

const originalDomain = import.meta.env.VITE_APP_DOMAIN;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

const mockUseTenantReturn = vi.hoisted(() =>
  vi.fn<() => { data: unknown; isLoading: boolean; error: unknown }>(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  }))
);

vi.mock("../hooks/use-tenant", () => ({
  useTenant: () => mockUseTenantReturn(),
}));

function TestRouter() {
  return (
    <Routes>
      <Route path="/tenants/:slug/*" element={<TenantDesktopPage />} />
    </Routes>
  );
}

function stubLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, "location", {
    value: {
      origin: url.origin,
      host: url.host,
      hostname: url.hostname,
      href: url.href,
      protocol: url.protocol,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      replace: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
  import.meta.env.VITE_APP_DOMAIN = "lvh.me";
  import.meta.env.VITE_APP_PROTOCOL = "http";
}

describe("TenantDesktopPage redirect", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(false);
    mockUseTenantReturn.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
    import.meta.env.VITE_APP_PROTOCOL = originalProtocol;
  });

  it("redirects to apex when the tenant is not found", async () => {
    stubLocation("http://unknown.lvh.me:5174/");
    mockUseTenantReturn.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: Object.assign(new Error("Not found"), {
        response: { status: 404 },
        isAxiosError: true,
      }),
    });

    render(<TestRouter />, { initialEntries: ["/tenants/unknown"] });

    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/")
    );
  });

  it("redirects to apex when the user is not a member", async () => {
    stubLocation("http://private.lvh.me:5174/");
    mockUseTenantReturn.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: Object.assign(new Error("Forbidden"), {
        response: { status: 403 },
        isAxiosError: true,
      }),
    });

    render(<TestRouter />, { initialEntries: ["/tenants/private"] });

    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/")
    );
  });

  it("redirects to apex when the API returns no tenant", async () => {
    stubLocation("http://empty.lvh.me:5174/");
    mockUseTenantReturn.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    render(<TestRouter />, { initialEntries: ["/tenants/empty"] });

    await waitFor(() =>
      expect(window.location.replace).toHaveBeenCalledWith("http://lvh.me:5174/")
    );
  });
});
