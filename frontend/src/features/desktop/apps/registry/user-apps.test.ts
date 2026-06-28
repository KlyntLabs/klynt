import { describe, expect, it } from "vitest";
import { userApps } from "./user-apps";

describe("userApps registry", () => {
  it("contains the expected user apps", () => {
    const ids = userApps.map((app) => app.id);
    expect(ids).toContain("profile");
    expect(ids).toContain("my-courses");
  });
});
