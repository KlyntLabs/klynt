import { apiClient } from "@/core/api/api-client";
import type { RegisterInput, RegisterResponse } from "./types";

export async function registerUser(
  input: RegisterInput,
  idempotencyKey: string,
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    "/users",
    {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      institution_id: input.institutionId ?? null,
      terms_accepted: input.termsAccepted,
      terms_version: input.termsVersion,
    },
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
  return data;
}
