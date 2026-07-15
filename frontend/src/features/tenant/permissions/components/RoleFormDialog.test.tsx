import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import type { Permission } from "../types";
import { RoleFormDialog } from "./RoleFormDialog";

const permissions: Permission[] = [
  { id: "perm-1", name: "tenant.view", description: "", category: "tenant" },
  { id: "perm-2", name: "tenant.manage_members", description: "", category: "tenant" },
];

describe("RoleFormDialog", () => {
  it("submits a new role with selected permissions", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <RoleFormDialog
        open
        title="Create role"
        roleData={null}
        permissions={permissions}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/role name/i), "Manager");
    await user.click(screen.getByRole("checkbox", { name: "tenant.view" }));

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Manager",
      description: "",
      permissionIds: ["perm-1"],
    });
  });

  it("does not render save button for system roles", () => {
    render(
      <RoleFormDialog
        open
        title="View role"
        roleData={{
          id: "role-owner",
          tenantId: "t-1",
          name: "owner",
          description: "",
          isSystem: true,
          permissionIds: ["perm-1"],
          createdAt: "2026-06-22T00:00:00Z",
          updatedAt: "2026-06-22T00:00:00Z",
        }}
        permissions={permissions}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  /**
   * The backend cannot rename a role: UpdateRoleRequest carries only `permission_ids`
   * (backend/crates/gateways/src/routes/roles.rs:113). Offering an editable name and
   * description in edit mode promises a change the API silently drops. Permissions stay
   * editable — those are the only thing PATCH actually applies.
   */
  it("locks name and description when editing an existing role, since PATCH only sends permissions", () => {
    render(
      <RoleFormDialog
        open
        title="Edit role"
        roleData={{
          id: "role-custom",
          tenantId: "t-1",
          name: "Manager",
          description: "Runs the place",
          isSystem: false,
          permissionIds: ["perm-1"],
          createdAt: "2026-06-22T00:00:00Z",
          updatedAt: "2026-06-22T00:00:00Z",
        }}
        permissions={permissions}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/role name/i)).toBeDisabled();
    expect(screen.getByLabelText(/description/i)).toBeDisabled();

    // Permissions remain editable — that is what the update actually persists.
    expect(screen.getByRole("checkbox", { name: "tenant.view" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("keeps name and description editable when creating a new role", () => {
    render(
      <RoleFormDialog
        open
        title="Create role"
        roleData={null}
        permissions={permissions}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/role name/i)).toBeEnabled();
    expect(screen.getByLabelText(/description/i)).toBeEnabled();
  });
});
