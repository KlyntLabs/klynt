import { apiClient, generateIdempotencyKey } from "@/core/api/api-client";

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

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const idempotencyKey = generateIdempotencyKey();
  const { data } = await apiClient.post<RegisterResponse>("/users", input, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return data;
}
