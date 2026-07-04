import { HttpResponse, http } from "msw";

const defaultLayout = {
  version: 1,
  background_preset_id: "fabric",
  icon_tree: [{ appId: "tenant-members", x: 24, y: 120 }],
  windows: [],
  etag: "v1",
};

export const tenantLayoutHandlers = [
  http.get("/api/v1/tenants/:slug/desktop-layout", () => {
    return HttpResponse.json({ data: defaultLayout });
  }),
  http.put("/api/v1/tenants/:slug/desktop-layout", async () => {
    return HttpResponse.json({ data: { ...defaultLayout, etag: "v2" } });
  }),
  http.get("/api/v1/tenants/:slug/desktop-layout/me", () => {
    return HttpResponse.json({ data: { ...defaultLayout, etag: "v1" } });
  }),
  http.put("/api/v1/tenants/:slug/desktop-layout/me", async () => {
    return HttpResponse.json({ data: { ...defaultLayout, etag: "v2" } });
  }),
];
