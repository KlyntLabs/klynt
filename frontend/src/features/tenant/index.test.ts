import { describe, expect, it } from "vitest";
import * as tenant from ".";

describe("tenant module exports", () => {
  it("exports tenant components and hooks", () => {
    expect(tenant.CreateTenantForm).toBeDefined();
    expect(tenant.TenantSwitcher).toBeDefined();
    expect(tenant.CreateTenantPage).toBeDefined();
    expect(tenant.TenantDesktopPage).toBeDefined();
    expect(tenant.TenantSettingsPage).toBeDefined();
  });
});
