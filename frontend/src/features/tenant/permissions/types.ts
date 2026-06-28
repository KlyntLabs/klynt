export type PermissionCategory = "tenant" | "member" | "role" | "content" | "platform";

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  permissionIds: string[];
}
