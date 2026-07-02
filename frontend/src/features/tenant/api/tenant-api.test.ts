import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { getTenantPublic } from "./tenant-api";

describe("tenant-api", () => {
  it("getTenantPublic returns tenant data on 200", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/public", () =>
        HttpResponse.json({ data: { slug: "acme", name: "Acme" } })
      )
    );

    const result = await getTenantPublic("acme");
    expect(result).toEqual({ slug: "acme", name: "Acme" });
  });

  it("getTenantPublic throws on 404", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/public", () =>
        HttpResponse.json({ error: "not found" }, { status: 404 })
      )
    );

    await expect(getTenantPublic("acme")).rejects.toThrow();
  });
});
