import axios from "axios";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: string;
  institutionId?: string;
  termsAccepted: boolean;
  termsVersion: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // TODO: global error handling (toast, logout on 401, etc.)
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

export async function registerUser(
  input: RegisterInput,
  idempotencyKey: string
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/users", input, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return data;
}
