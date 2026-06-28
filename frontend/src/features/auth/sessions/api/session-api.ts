import { apiClient } from "@/core/api/api-client";

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  kind: string;
  userAgent?: string;
  ipAddress?: string;
  isCurrent?: boolean;
}

interface ListSessionsResponse {
  data: {
    sessions: Session[];
  };
}

export async function listSessions(): Promise<Session[]> {
  const { data } = await apiClient.get<ListSessionsResponse>("/auth/sessions");
  return data.data.sessions;
}

export async function revokeSession(id: string): Promise<void> {
  await apiClient.delete(`/auth/sessions/${id}`);
}
