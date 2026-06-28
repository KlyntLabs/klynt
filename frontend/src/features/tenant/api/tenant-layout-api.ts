import { apiClient } from "@/core/api/api-client";
import type { DesktopLayout } from "@/features/desktop/persistence/types";

export type TenantLayoutResponse = {
  data: DesktopLayout & { etag: string };
};

export const tenantLayoutApi = {
  getShared: (slug: string) =>
    apiClient.get<TenantLayoutResponse>(`/tenants/${slug}/desktop-layout`),
  updateShared: (slug: string, layout: DesktopLayout, etag: string) =>
    apiClient.put<TenantLayoutResponse>(`/tenants/${slug}/desktop-layout`, { ...layout, etag }),
  getMine: (slug: string) =>
    apiClient.get<TenantLayoutResponse>(`/tenants/${slug}/desktop-layout/me`),
  updateMine: (slug: string, layout: DesktopLayout) =>
    apiClient.put<TenantLayoutResponse>(`/tenants/${slug}/desktop-layout/me`, layout),
};
