export type Role = "student" | "teacher" | "admin" | "parent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
