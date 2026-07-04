import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildTenantDesktop } from "@/features/desktop/factory/tenant-desktop";
import type { DesktopConfig } from "@/features/desktop/factory/types";
import { resetDesktopStore } from "@/features/desktop/test-helpers";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { resetTenantHandlers } from "@/test/msw/handlers/tenant.handlers";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import TenantDesktopPage from "./tenant-desktop-page";

vi.mock("@/features/desktop/factory/tenant-desktop", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/features/desktop/factory/tenant-desktop")>();
  return { ...original, buildTenantDesktop: vi.fn(original.buildTenantDesktop) };
});

vi.mock("@/core/auth/external-redirect", () => ({
  navigateExternal: vi.fn(),
}));

function TestRouter() {
  return (
    <Routes>
      <Route path="/tenants/:slug/*" element={<TenantDesktopPage />} />
    </Routes>
  );
}

describe("TenantDesktopPage", () => {
  beforeEach(() => {
    resetDesktopStore();
    resetTenantHandlers();
    vi.clearAllMocks();
  });

  it("renders the tenant desktop", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme"],
    });

    expect(await screen.findByText("Klynt")).toBeInTheDocument();
  });

  it("passes the tenant role from the API to buildTenantDesktop", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme"],
    });

    await waitFor(() =>
      expect(buildTenantDesktop).toHaveBeenLastCalledWith("acme", "owner", expect.anything())
    );

    const result = vi.mocked(buildTenantDesktop).mock.results.slice(-1)[0]?.value as DesktopConfig;
    expect(result.persistence.canEdit()).toBe(true);
  });

  it("defaults to the member role when the API reports no role", async () => {
    server.use(
      http.get("/api/v1/tenants/:slug", () =>
        HttpResponse.json({
          data: {
            id: "2",
            slug: "acme",
            name: "Acme",
            role: "member",
            joined_at: "2026-06-22T00:00:00Z",
          },
        })
      )
    );

    render(<TestRouter />, {
      initialEntries: ["/tenants/acme"],
    });

    await waitFor(() =>
      expect(buildTenantDesktop).toHaveBeenLastCalledWith("acme", "member", expect.anything())
    );

    const result = vi.mocked(buildTenantDesktop).mock.results.slice(-1)[0]?.value as DesktopConfig;
    expect(result.persistence.canEdit()).toBe(false);
  });

  it("opens the members app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/members"],
    });

    await waitFor(() => {
      const windows = useWindowManager.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-members");
    });
  });

  it("opens the roles app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/roles"],
    });

    await waitFor(() => {
      const windows = useWindowManager.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-roles");
    });
  });

  it("opens the settings app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    await waitFor(() => {
      const windows = useWindowManager.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-settings");
    });
  });

  it("redirects to apex when the tenant is not found", async () => {
    server.use(
      http.get("/api/v1/tenants/:slug", () =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      )
    );

    render(<TestRouter />, {
      initialEntries: ["/tenants/missing"],
    });

    await waitFor(() => expect(navigateExternal).toHaveBeenCalled(), { timeout: 5000 });
  });
});
