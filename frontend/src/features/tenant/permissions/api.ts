import { apiClient } from "@/core/api/api-client";
import type { CreateRoleInput, Permission, Role, UpdateRoleInput } from "./types";

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<{ data: Permission[] }>("/permissions");
  return data.data;
}

export async function listRoles(tenantSlug: string): Promise<Role[]> {
  const { data } = await apiClient.get<{ data: Role[] }>(`/tenants/${tenantSlug}/roles`);
  return data.data;
}

export async function createRole(tenantSlug: string, input: CreateRoleInput): Promise<Role> {
  const { data } = await apiClient.post<{ data: Role }>(`/tenants/${tenantSlug}/roles`, input);
  return data.data;
}

export async function updateRole(
  tenantSlug: string,
  roleId: string,
  input: UpdateRoleInput
): Promise<Role> {
  const { data } = await apiClient.patch<{ data: Role }>(
    `/tenants/${tenantSlug}/roles/${roleId}`,
    input
  );
  return data.data;
}

export async function deleteRole(tenantSlug: string, roleId: string): Promise<void> {
  await apiClient.delete(`/tenants/${tenantSlug}/roles/${roleId}`);
}
