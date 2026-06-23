import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { routePaths } from "@/core/routing/route-paths";
import { resetTenantHandlers } from "@/test/msw/handlers/tenant.handlers";
import { render } from "@/test/render";
import TenantSettingsPage from "./tenant-settings-page";

function TestRouter() {
  return (
    <Routes>
      <Route path={routePaths.tenantSettings} element={<TenantSettingsPage />} />
      <Route
        path={routePaths.dashboard}
        element={<div data-testid="dashboard-page">Dashboard</div>}
      />
    </Routes>
  );
}

describe("TenantSettingsPage", () => {
  beforeEach(() => {
    resetTenantHandlers();
  });

  it("displays tenant details after loading", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    expect(await screen.findByDisplayValue("Acme")).toBeInTheDocument();
    expect(screen.getByDisplayValue("acme")).toBeInTheDocument();
  });

  it("renders the slug field as read-only", async () => {
    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    const slugInput = await screen.findByTestId("tenant-slug-input");
    expect(slugInput).toHaveAttribute("readonly");
    expect(slugInput).toBeDisabled();
  });

  it("updates tenant name", async () => {
    const user = userEvent.setup();

    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    const nameInput = await screen.findByTestId("tenant-name-input");
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Inc");

    await user.click(screen.getByTestId("save-tenant-button"));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Inc")).toBeInTheDocument();
    });
  });

  it("deletes tenant after confirmation and redirects to dashboard", async () => {
    const user = userEvent.setup();

    render(<TestRouter />, {
      initialEntries: ["/tenants/acme/settings"],
    });

    await screen.findByDisplayValue("Acme");

    await user.click(screen.getByTestId("delete-tenant-button"));
    expect(await screen.findByTestId("confirm-delete-tenant")).toBeInTheDocument();

    await user.click(screen.getByTestId("confirm-delete-tenant"));

    expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
  });
});
