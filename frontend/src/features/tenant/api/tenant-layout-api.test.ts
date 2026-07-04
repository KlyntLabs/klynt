import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { tenantLayoutApi } from "./tenant-layout-api";

describe("tenantLayoutApi", () => {
  it("getShared fetches shared layout", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/desktop-layout", () =>
        HttpResponse.json({ data: { icon_tree: [], etag: "1" } })
      )
    );
    const result = await tenantLayoutApi.getShared("acme");
    expect(result.data.data.etag).toBe("1");
  });

  it("updateShared puts shared layout", async () => {
    server.use(
      http.put("/api/v1/tenants/acme/desktop-layout", async ({ request }) => {
        const body = (await request.json()) as { etag: string };
        return HttpResponse.json({ data: { icon_tree: [], etag: body.etag } });
      })
    );
    const result = await tenantLayoutApi.updateShared(
      "acme",
      { version: 1, backgroundPresetId: "default", iconTree: [], windows: [] },
      "2"
    );
    expect(result.data.data.etag).toBe("2");
  });

  it("getMine fetches user layout", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/desktop-layout/me", () =>
        HttpResponse.json({ data: { icon_tree: [], etag: "3" } })
      )
    );
    const result = await tenantLayoutApi.getMine("acme");
    expect(result.data.data.etag).toBe("3");
  });

  it("updateMine puts user layout", async () => {
    server.use(
      http.put("/api/v1/tenants/acme/desktop-layout/me", () =>
        HttpResponse.json({ data: { icon_tree: [], etag: "4" } })
      )
    );
    const result = await tenantLayoutApi.updateMine("acme", {
      version: 1,
      backgroundPresetId: "default",
      iconTree: [],
      windows: [],
    });
    expect(result.data.data.etag).toBe("4");
  });
});
