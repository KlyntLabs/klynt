import { screen, within } from "@testing-library/react";
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

    // Dialog queries must be scoped. Astryx's Dialog keeps its content mounted, and this page
    // renders two of them (create + edit), so the unscoped /role name/i now matches both
    // dialogs' labels AND the table's column header.
    const createDialog = await screen.findByRole("dialog");
    await user.type(within(createDialog).getByLabelText(/role name/i), "Manager");
    await user.click(within(createDialog).getByRole("checkbox", { name: "tenant.view" }));
    await user.click(within(createDialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Manager")).toBeInTheDocument();
  });

  it("edits a custom role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/roles" element={<RolesPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/roles"] }
    );

    expect(await screen.findByText("owner")).toBeInTheDocument();

    // Create a custom role first so it can be edited.
    await user.click(screen.getByRole("button", { name: /create role/i }));
    const createDialog = await screen.findByRole("dialog");
    await user.type(within(createDialog).getByLabelText(/role name/i), "Editor");
    await user.click(within(createDialog).getByRole("button", { name: /save/i }));
    expect(await screen.findByText("Editor")).toBeInTheDocument();

    // Edit the custom role. The row's edit button is reached by role rather than by
    // `button[data-variant="outline"]` — that was a shadcn implementation detail.
    // It is labelled "Edit", not "Save": it opens the dialog, it does not persist anything.
    const rows = screen.getAllByRole("row");
    const editorRow = rows.find((row) => row.textContent?.includes("Editor"));
    if (!editorRow) throw new Error("Editor role row not found");
    expect(within(editorRow).queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();
    await user.click(within(editorRow).getByRole("button", { name: /edit/i }));

    const editDialog = await screen.findByRole("dialog");
    await user.click(within(editDialog).getByRole("checkbox", { name: "tenant.manage_members" }));
    await user.click(within(editDialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Editor")).toBeInTheDocument();
  });

  it("deletes a custom role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/roles" element={<RolesPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/roles"] }
    );

    expect(await screen.findByText("owner")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /delete/i })[0]);

    await screen.findByText("owner");
  });
});
