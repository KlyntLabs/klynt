export type UserRole = "admin" | "instructor" | "student";

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  status: "pending" | "active" | "suspended" | "deleted";
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  username: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
