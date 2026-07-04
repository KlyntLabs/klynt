import { describe, expect, it } from "vitest";
import type { PublicTenant, Tenant } from "./types";

describe("tenant types", () => {
  it("type definitions compile", () => {
    const publicTenant: PublicTenant = { slug: "acme", name: "Acme" };
    const tenant: Tenant = {
      id: "t1",
      slug: "acme",
      name: "Acme",
      role: "owner",
      joinedAt: "2024-01-01",
    };
    expect(publicTenant.slug).toBe(tenant.slug);
  });
});
