import { describe, expect, it } from "vitest";
import { tenantApps } from "./tenant-apps";

describe("tenantApps registry", () => {
  it("contains the expected tenant apps", () => {
    const ids = tenantApps.map((app) => app.id);
    expect(ids).toContain("tenant-members");
    expect(ids).toContain("tenant-roles");
    expect(ids).toContain("tenant-settings");
  });

  it("lists all apps in dock order", () => {
    const orders = tenantApps.map((app) => app.dock?.order ?? -1);
    expect(orders).toEqual([1, 2, 3]);
  });
});
