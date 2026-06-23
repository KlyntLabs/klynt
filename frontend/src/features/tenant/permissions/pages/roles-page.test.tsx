import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { render } from "@/test/render";
import RolesPage from "./roles-page";

const baseTenant = {
  id: "t-1",
  slug: "acme",
  name: "Acme",
  joinedAt: "2026-06-22T00:00:00Z",
};

describe("RolesPage", () => {
  it("lists tenant roles and creates a new role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/roles" element={<RolesPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/roles"] }
    );

    expect(await screen.findByText("owner")).toBeInTheDocument();
    expect(screen.getByText("member")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /create role/i }));

    await user.type(screen.getByLabelText(/role name/i), "Manager");
    await user.click(screen.getByRole("checkbox", { name: "tenant.view" }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Manager")).toBeInTheDocument();
  });
});
