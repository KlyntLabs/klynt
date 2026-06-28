import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { render } from "@/test/render";
import { PermissionGuard } from "./PermissionGuard";

const baseTenant = {
  id: "t-1",
  slug: "acme",
  name: "Acme",
  joinedAt: "2026-06-22T00:00:00Z",
};

describe("PermissionGuard", () => {
  it("renders children when the permission is granted", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });

    render(
      <PermissionGuard tenantSlug="acme" permission="tenant.manage_members">
        <div data-testid="protected">protected content</div>
      </PermissionGuard>
    );

    expect(await screen.findByTestId("protected")).toBeInTheDocument();
  });

  it("renders the fallback when the permission is denied", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "member" });

    render(
      <PermissionGuard
        tenantSlug="acme"
        permission="tenant.manage_members"
        fallback={<div data-testid="fallback">no access</div>}
      >
        <div data-testid="protected">protected content</div>
      </PermissionGuard>
    );

    expect(await screen.findByTestId("fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });
});
