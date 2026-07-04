import { apiClient } from "@/core/api/api-client";

export type AppType = "markdown" | "notes" | "video" | "folder";

export type DesktopApp = {
  id: string;
  type: AppType;
  title: string;
  content: Record<string, unknown>;
  menuConfig: Record<string, unknown>;
  ownerId: string | null;
  locked: boolean;
  etag: string;
};

export type AppSummary = Omit<DesktopApp, "content" | "menuConfig">;

export type CreateAppPayload = {
  type: AppType;
  title: string;
  content?: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
};

export type UpdateAppPayload = {
  etag: string;
  title?: string;
  content?: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
};

export type DesktopBundleResponse = {
  apps: AppSummary[];
  etag: string;
};

export const desktopAppsApi = {
  create: (slug: string, payload: CreateAppPayload) =>
    apiClient.post<{ data: DesktopApp }>(`/tenants/${slug}/desktop/apps`, payload),

  getDesktop: (slug: string) =>
    apiClient.get<{ data: DesktopBundleResponse }>(`/tenants/${slug}/desktop`),

  getApp: (slug: string, appId: string) =>
    apiClient.get<{ data: DesktopApp }>(`/tenants/${slug}/apps/${appId}`),

  update: (
    slug: string,
    appId: string,
    payload: UpdateAppPayload,
    options?: { signal?: AbortSignal }
  ) =>
    apiClient.patch<{ data: DesktopApp }>(`/tenants/${slug}/apps/${appId}`, payload, {
      signal: options?.signal,
    }),

  delete: (slug: string, appId: string) => apiClient.delete(`/tenants/${slug}/apps/${appId}`),
};
