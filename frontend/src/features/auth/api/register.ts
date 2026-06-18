import { type RegisterInput, type RegisterResponse, registerUser } from "@/lib/api-client";

export type { RegisterInput, RegisterResponse };

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const idempotencyKey = crypto.randomUUID();
  return registerUser(input, idempotencyKey);
}
