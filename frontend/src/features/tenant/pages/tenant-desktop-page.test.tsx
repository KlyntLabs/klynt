import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { resetDesktopStore } from "@/features/desktop/test-helpers";
import { render } from "@/test/render";
import TenantDesktopPage from "./tenant-desktop-page";

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
  });

  it("renders the tenant desktop", () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme"],
    });

    expect(screen.getByText("Klynt")).toBeInTheDocument();
  });

  it("opens the members app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/members"],
    });

    await waitFor(() => {
      const windows = useDesktopStore.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-members");
    });
  });

  it("opens the roles app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/roles"],
    });

    await waitFor(() => {
      const windows = useDesktopStore.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-roles");
    });
  });

  it("opens the settings app from deep link", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    await waitFor(() => {
      const windows = useDesktopStore.getState().windows["tenant:acme"];
      expect(windows).toHaveLength(1);
      expect(windows?.[0]?.appId).toBe("tenant-settings");
    });
  });
});
