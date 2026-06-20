import { routePaths } from "@/core/routing/route-paths";
import type { RegisterInput, RegisterResponse } from "@/features/auth/api/types";

export interface RegisterCommandDeps {
  /** Call the registration API with the given idempotency key. */
  register: (input: RegisterInput, idempotencyKey: string) => Promise<RegisterResponse>;
  /** Navigate after successful registration. */
  navigate: (path: string, state?: { state: { user: { name: string; email: string } } }) => void;
}

/**
 * Execute a registration intent.
 *
 * The caller is responsible for providing a stable idempotency key across
 * TanStack Query retries. Rotating the key per user intent is handled by the
 * caller (the hook), not by this command.
 */
export async function registerCommand(
  input: RegisterInput,
  idempotencyKey: string,
  deps: RegisterCommandDeps
): Promise<RegisterResponse> {
  const response = await deps.register(input, idempotencyKey);
  deps.navigate(routePaths.registerSuccess, {
    state: { user: { name: response.name, email: response.email } },
  });
  return response;
}
