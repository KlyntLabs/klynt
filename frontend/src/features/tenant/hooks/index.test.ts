import { describe, expect, it } from "vitest";
import * as hooks from ".";

describe("tenant hooks module exports", () => {
  it("exports tenant hooks", () => {
    expect(hooks.useAcceptTenantInvite).toBeDefined();
    expect(hooks.useRemoveTenant).toBeDefined();
    expect(hooks.useTenant).toBeDefined();
    expect(hooks.useTenantSlug).toBeDefined();
    expect(hooks.useUpdateTenant).toBeDefined();
  });
});
