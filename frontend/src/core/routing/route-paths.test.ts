import { describe, expect, it } from "vitest";
import { routePaths } from "./route-paths";

describe("routePaths", () => {
  it("provides static route paths", () => {
    expect(routePaths.home).toBe("/");
    expect(routePaths.register).toBe("/register");
    expect(routePaths.registerSuccess).toBe("/register/success");
    expect(routePaths.dashboard).toBe("/dashboard");
  });
});
