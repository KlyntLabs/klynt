import { apiClient } from "@/core/api/api-client";
import type { InviteMemberInput, Member, UpdateMemberRoleInput } from "../types";

export const memberApi = {
  list: (slug: string) => apiClient.get<{ data: Member[] }>(`/tenants/${slug}/members`),
  invite: (slug: string, payload: InviteMemberInput) =>
    apiClient.post<{ data: Member }>(`/tenants/${slug}/members`, payload),
  updateRole: (slug: string, payload: UpdateMemberRoleInput) =>
    apiClient.patch(`/tenants/${slug}/members`, payload),
  remove: (slug: string, email: string) =>
    apiClient.delete(`/tenants/${slug}/members`, { data: { email } }),
};
