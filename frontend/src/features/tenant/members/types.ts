export type TenantRole = "owner" | "admin" | "member" | "guest";

export const ROLE_OPTIONS: TenantRole[] = ["owner", "admin", "member", "guest"];

export interface Member {
  userId: string;
  email: string;
  fullName: string | null;
  role: TenantRole;
  joinedAt: string;
}

export interface InviteMemberInput {
  email: string;
  role: TenantRole;
}

export interface UpdateMemberRoleInput {
  email: string;
  role: TenantRole;
}

export interface TenantInvite {
  token: string;
  email: string;
  role: TenantRole;
  expiresAt: string;
}
