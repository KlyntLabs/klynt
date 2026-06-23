import { HttpResponse, http } from "msw";

const permissionCatalog = [
  { id: "perm-1", name: "tenant.view", description: "", category: "tenant" as const },
  { id: "perm-2", name: "tenant.manage_settings", description: "", category: "tenant" as const },
  { id: "perm-3", name: "tenant.manage_members", description: "", category: "tenant" as const },
  { id: "perm-4", name: "tenant.manage_roles", description: "", category: "tenant" as const },
  { id: "perm-5", name: "tenant.delete", description: "", category: "tenant" as const },
];

export const permissionsHandlers = [
  http.get("/api/v1/permissions", () => HttpResponse.json({ data: permissionCatalog })),

  http.get("/api/v1/tenants/:slug/roles", ({ params }) => {
    const tenantId = `tenant-${params.slug as string}`;
    return HttpResponse.json({
      data: [
        {
          id: "role-owner",
          tenantId,
          name: "owner",
          description: "",
          isSystem: true,
          permissionIds: permissionCatalog.map((p) => p.id),
          createdAt: "2026-06-22T00:00:00Z",
          updatedAt: "2026-06-22T00:00:00Z",
        },
        {
          id: "role-member",
          tenantId,
          name: "member",
          description: "",
          isSystem: true,
          permissionIds: ["perm-1"],
          createdAt: "2026-06-22T00:00:00Z",
          updatedAt: "2026-06-22T00:00:00Z",
        },
      ],
    });
  }),
];
