export interface Tenant {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "admin" | "member" | "guest";
  joinedAt: string;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
}

export type UpdateTenantInput = Partial<CreateTenantInput>;
