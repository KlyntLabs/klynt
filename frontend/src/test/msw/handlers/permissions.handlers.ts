import { HttpResponse, http } from "msw";

const permissionCatalog = [
  { id: "perm-1", name: "tenant.view", description: "", category: "tenant" as const },
  { id: "perm-2", name: "tenant.manage_settings", description: "", category: "tenant" as const },
  { id: "perm-3", name: "tenant.manage_members", description: "", category: "tenant" as const },
  { id: "perm-4", name: "tenant.manage_roles", description: "", category: "tenant" as const },
  { id: "perm-5", name: "tenant.delete", description: "", category: "tenant" as const },
];

interface BackendRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  is_system: boolean;
  permission_ids: string[];
  created_at: string;
  updated_at: string;
}

const baseRolesBySlug = new Map<string, BackendRole[]>();

function getBaseRoles(slug: string): BackendRole[] {
  if (!baseRolesBySlug.has(slug)) {
    baseRolesBySlug.set(slug, [
      {
        id: "role-owner",
        tenant_id: `tenant-${slug}`,
        name: "owner",
        description: "",
        is_system: true,
        permission_ids: permissionCatalog.map((p) => p.id),
        created_at: "2026-06-22T00:00:00Z",
        updated_at: "2026-06-22T00:00:00Z",
      },
      {
        id: "role-member",
        tenant_id: `tenant-${slug}`,
        name: "member",
        description: "",
        is_system: true,
        permission_ids: ["perm-1"],
        created_at: "2026-06-22T00:00:00Z",
        updated_at: "2026-06-22T00:00:00Z",
      },
    ]);
  }
  return baseRolesBySlug.get(slug) ?? [];
}

const createdRolesBySlug = new Map<string, BackendRole[]>();

function getCreatedRoles(slug: string): BackendRole[] {
  return createdRolesBySlug.get(slug) ?? [];
}

export const permissionsHandlers = [
  http.get("/api/v1/permissions", () => HttpResponse.json({ data: permissionCatalog })),

  http.get("/api/v1/tenants/:slug/roles", ({ params }) => {
    const slug = params.slug as string;
    return HttpResponse.json({
      data: [...getBaseRoles(slug), ...getCreatedRoles(slug)],
    });
  }),

  http.post("/api/v1/tenants/:slug/roles", async ({ request, params }) => {
    const slug = params.slug as string;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      permission_ids?: string[];
    };
    const role: BackendRole = {
      id: `role-new-${Date.now()}`,
      tenant_id: `tenant-${slug}`,
      name: body.name ?? "New Role",
      description: body.description ?? "",
      is_system: false,
      permission_ids: body.permission_ids ?? [],
      created_at: "2026-06-22T00:00:00Z",
      updated_at: "2026-06-22T00:00:00Z",
    };
    createdRolesBySlug.set(slug, [...getCreatedRoles(slug), role]);
    return HttpResponse.json({ data: role }, { status: 201 });
  }),

  http.patch("/api/v1/tenants/:slug/roles/:roleId", async ({ request, params }) => {
    const body = (await request.json()) as { permission_ids?: string[] };
    const role: BackendRole = {
      id: params.roleId as string,
      tenant_id: `tenant-${params.slug as string}`,
      name: "Custom Role",
      description: "",
      is_system: false,
      permission_ids: body.permission_ids ?? [],
      created_at: "2026-06-22T00:00:00Z",
      updated_at: "2026-06-22T00:00:00Z",
    };
    return HttpResponse.json({ data: role });
  }),

  http.delete("/api/v1/tenants/:slug/roles/:roleId", () => new HttpResponse(null, { status: 204 })),
];
