import { describe, expect, it } from "vitest";
import * as permissions from ".";

describe("tenant permissions module exports", () => {
  it("exports roles page and guard", () => {
    expect(permissions.RolesPage).toBeDefined();
    expect(permissions.PermissionGuard).toBeDefined();
    expect(permissions.RoleFormDialog).toBeDefined();
  });
});
