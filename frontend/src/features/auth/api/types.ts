import type { Role } from "@/core/auth/types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  institutionId?: string;
  termsAccepted: boolean;
  termsVersion: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  created_at: string;
}
