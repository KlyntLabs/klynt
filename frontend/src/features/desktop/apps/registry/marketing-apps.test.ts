import { describe, expect, it } from "vitest";
import { marketingApps, marketingRegistry } from "./marketing-apps";

describe("marketingApps registry", () => {
  it("includes the home app as the default", () => {
    expect(marketingRegistry.defaultApp.id).toBe("home");
  });

  it("contains every route exactly once", () => {
    const routes = marketingApps.map((app) => app.route);
    const uniqueRoutes = new Set(routes);
    expect(uniqueRoutes.size).toBe(routes.length);
  });

  it("groups apps by menu group", () => {
    const productApps = marketingApps.filter((app) => app.menuGroup === "productOS");
    expect(productApps.length).toBeGreaterThan(1);
  });
});
