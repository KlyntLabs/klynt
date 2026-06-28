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
});
