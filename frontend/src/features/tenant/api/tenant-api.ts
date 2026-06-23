import { apiClient } from "@/core/api/api-client";
import type { CreateTenantInput, Tenant, UpdateTenantInput } from "../types";

export async function listMyTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<{ data: Tenant[] }>("/tenants");
  return data.data;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.post<{ data: Tenant }>("/tenants", input);
  return data.data;
}

export async function getTenant(slug: string): Promise<Tenant> {
  const { data } = await apiClient.get<{ data: Tenant }>(`/tenants/${slug}`);
  return data.data;
}

export async function updateTenant(slug: string, input: UpdateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.patch<{ data: Tenant }>(`/tenants/${slug}`, input);
  return data.data;
}

export async function removeTenant(slug: string): Promise<void> {
  await apiClient.delete(`/tenants/${slug}`);
}

export async function acceptTenantInvite(token: string): Promise<Tenant> {
  const { data } = await apiClient.post<{ data: Tenant }>(`/tenants/invites/${token}/accept`);
  return data.data;
}

export const tenantApi = {
  create: createTenant,
  list: listMyTenants,
  get: getTenant,
  update: updateTenant,
  remove: removeTenant,
  acceptInvite: acceptTenantInvite,
};
