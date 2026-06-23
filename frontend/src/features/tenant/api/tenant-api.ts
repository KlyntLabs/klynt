import { apiClient } from "@/core/api/api-client";
import type { CreateTenantInput, Tenant } from "../types";

export async function listMyTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<{ data: Tenant[] }>("/tenants");
  return data.data;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.post<{ data: Tenant }>("/tenants", input);
  return data.data;
}
