import { apiClient } from "@/core/api/api-client";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  User,
  VerifyEmailInput,
} from "../types";

interface SuccessResponse<T> {
  data: T;
  message?: string;
}

interface MessageResponse {
  message: string;
}

interface BackendUser {
  id: string;
  email: string;
  full_name?: string | null;
  role: "admin" | "instructor" | "student";
  status?: "pending" | "active" | "suspended" | "deleted";
  created_at?: string;
}

function mapUser(backend: BackendUser): User {
  return {
    id: backend.id,
    email: backend.email,
    name: backend.full_name ?? backend.email,
    role: backend.role,
    status: backend.status ?? "pending",
    createdAt: backend.created_at ?? new Date().toISOString(),
  };
}

export async function login(input: LoginInput): Promise<User> {
  const { data } = await apiClient.post<SuccessResponse<{ user: BackendUser }>>(
    "/auth/login",
    input
  );
  return mapUser(data.data.user);
}

export async function register(input: RegisterInput): Promise<{ userId: string }> {
  const { data } = await apiClient.post<SuccessResponse<string>>("/auth/register", {
    email: input.email,
    password: input.password,
    full_name: input.name,
  });
  return { userId: data.data };
}

export async function logout(): Promise<void> {
  await apiClient.post<MessageResponse>("/auth/logout");
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<SuccessResponse<BackendUser>>("/users/me");
  return mapUser(data.data);
}

export async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  await apiClient.post<MessageResponse>("/auth/verify-email", input);
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  await apiClient.post<MessageResponse>("/auth/request-password-reset", input);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await apiClient.post<MessageResponse>("/auth/reset-password", {
    token: input.token,
    new_password: input.password,
  });
}
