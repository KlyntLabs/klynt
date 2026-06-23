import { HttpResponse, http } from "msw";
import type { Role } from "@/features/tenant/permissions/types";

const permissionCatalog = [
  { id: "perm-1", name: "tenant.view", description: "", category: "tenant" as const },
  { id: "perm-2", name: "tenant.manage_settings", description: "", category: "tenant" as const },
  { id: "perm-3", name: "tenant.manage_members", description: "", category: "tenant" as const },
  { id: "perm-4", name: "tenant.manage_roles", description: "", category: "tenant" as const },
  { id: "perm-5", name: "tenant.delete", description: "", category: "tenant" as const },
];

const baseRolesBySlug = new Map<string, Role[]>();

function getBaseRoles(slug: string): Role[] {
  if (!baseRolesBySlug.has(slug)) {
    baseRolesBySlug.set(slug, [
      {
        id: "role-owner",
        tenantId: `tenant-${slug}`,
        name: "owner",
        description: "",
        isSystem: true,
        permissionIds: permissionCatalog.map((p) => p.id),
        createdAt: "2026-06-22T00:00:00Z",
        updatedAt: "2026-06-22T00:00:00Z",
      },
      {
        id: "role-member",
        tenantId: `tenant-${slug}`,
        name: "member",
        description: "",
        isSystem: true,
        permissionIds: ["perm-1"],
        createdAt: "2026-06-22T00:00:00Z",
        updatedAt: "2026-06-22T00:00:00Z",
      },
    ]);
  }
  return baseRolesBySlug.get(slug) as Role[];
}

const createdRolesBySlug = new Map<string, Role[]>();

function getCreatedRoles(slug: string): Role[] {
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
      permissionIds?: string[];
    };
    const role: Role = {
      id: `role-new-${Date.now()}`,
      tenantId: `tenant-${slug}`,
      name: body.name ?? "New Role",
      description: body.description ?? "",
      isSystem: false,
      permissionIds: body.permissionIds ?? [],
      createdAt: "2026-06-22T00:00:00Z",
      updatedAt: "2026-06-22T00:00:00Z",
    };
    createdRolesBySlug.set(slug, [...getCreatedRoles(slug), role]);
    return HttpResponse.json({ data: role }, { status: 201 });
  }),

  http.patch("/api/v1/tenants/:slug/roles/:roleId", async ({ request, params }) => {
    const body = (await request.json()) as { permissionIds?: string[] };
    return HttpResponse.json({
      data: {
        id: params.roleId,
        tenantId: `tenant-${params.slug as string}`,
        name: "Custom Role",
        description: "",
        isSystem: false,
        permissionIds: body.permissionIds ?? [],
        createdAt: "2026-06-22T00:00:00Z",
        updatedAt: "2026-06-22T00:00:00Z",
      },
    });
  }),

  http.delete("/api/v1/tenants/:slug/roles/:roleId", () => new HttpResponse(null, { status: 204 })),
];
