import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { createRole, deleteRole, listPermissions, listRoles, updateRole } from "./api";

describe("permissions api", () => {
  it("lists permissions", async () => {
    server.use(
      http.get("/api/v1/permissions", () =>
        HttpResponse.json({ data: [{ id: "p1", name: "read" }] })
      )
    );
    const result = await listPermissions();
    expect(result).toHaveLength(1);
  });

  it("lists roles", async () => {
    server.use(
      http.get("/api/v1/tenants/acme/roles", () =>
        HttpResponse.json({ data: [{ id: "r1", name: "Admin" }] })
      )
    );
    const result = await listRoles("acme");
    expect(result).toHaveLength(1);
  });

  it("creates a role", async () => {
    server.use(
      http.post("/api/v1/tenants/acme/roles", () =>
        HttpResponse.json({ data: { id: "r2", name: "Editor" } })
      )
    );
    const result = await createRole("acme", { name: "Editor", permissionIds: [] });
    expect(result.name).toBe("Editor");
  });

  it("updates a role", async () => {
    server.use(
      http.patch("/api/v1/tenants/acme/roles/r2", () =>
        HttpResponse.json({ data: { id: "r2", name: "Updated" } })
      )
    );
    const result = await updateRole("acme", "r2", { permissionIds: ["p1"] });
    expect(result.name).toBe("Updated");
  });

  it("deletes a role", async () => {
    server.use(
      http.delete("/api/v1/tenants/acme/roles/r2", () => new HttpResponse(null, { status: 204 }))
    );
    await expect(deleteRole("acme", "r2")).resolves.toBeUndefined();
  });
});
