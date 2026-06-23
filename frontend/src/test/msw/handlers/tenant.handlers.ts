import { HttpResponse, http } from "msw";

interface TenantFixture {
  id: string;
  slug: string;
  name: string;
  role: string;
  joined_at: string;
}

const defaultTenants: TenantFixture[] = [
  {
    id: "1",
    slug: "acme",
    name: "Acme",
    role: "owner",
    joined_at: "2026-06-22T00:00:00Z",
  },
];

const tenants = new Map<string, TenantFixture>(
  defaultTenants.map((tenant) => [tenant.slug, tenant])
);

export function resetTenantHandlers(): void {
  tenants.clear();
  for (const tenant of defaultTenants) {
    tenants.set(tenant.slug, { ...tenant });
  }
}

export const tenantHandlers = [
  http.get("/api/v1/tenants", () =>
    HttpResponse.json({
      data: Array.from(tenants.values()),
    })
  ),
  http.get("/api/v1/tenants/:slug", ({ params }) => {
    const tenant = tenants.get(params.slug as string);
    if (!tenant) {
      return HttpResponse.json({ message: "Tenant not found" }, { status: 404 });
    }
    return HttpResponse.json({ data: tenant });
  }),
  http.post("/api/v1/tenants", async ({ request }) => {
    const body = (await request.json()) as { slug?: string; name?: string };
    const tenant = {
      id: String(tenants.size + 1),
      slug: body.slug ?? "new-tenant",
      name: body.name ?? "New Tenant",
      role: "owner",
      joined_at: "2026-06-22T00:00:00Z",
    };
    tenants.set(tenant.slug, tenant);
    return HttpResponse.json({ data: tenant }, { status: 201 });
  }),
  http.patch("/api/v1/tenants/:slug", async ({ params, request }) => {
    const slug = params.slug as string;
    const existing = tenants.get(slug);
    if (!existing) {
      return HttpResponse.json({ message: "Tenant not found" }, { status: 404 });
    }
    const body = (await request.json()) as { name?: string };
    const updated = {
      ...existing,
      name: body.name ?? existing.name,
    };
    tenants.set(slug, updated);
    return HttpResponse.json({ data: updated });
  }),
  http.delete("/api/v1/tenants/:slug", ({ params }) => {
    const slug = params.slug as string;
    if (!tenants.has(slug)) {
      return HttpResponse.json({ message: "Tenant not found" }, { status: 404 });
    }
    tenants.delete(slug);
    return new HttpResponse(null, { status: 204 });
  }),
];
