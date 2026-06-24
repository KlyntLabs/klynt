import { describe, expect, it } from "vitest";
import { adminApps } from "./admin-apps";

describe("adminApps registry", () => {
  it("contains the expected admin apps", () => {
    const ids = adminApps.map((app) => app.id);
    expect(ids).toContain("user-management");
    expect(ids).toContain("tenant-management");
    expect(ids).toContain("reports");
  });
});
