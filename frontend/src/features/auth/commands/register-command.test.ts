import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/core/api/api-error";
import { routePaths } from "@/core/routing/route-paths";
import type { RegisterInput, RegisterResponse } from "@/features/auth/api/types";
import { registerCommand } from "./register-command";

const validInput: RegisterInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "str0ng!passphrase",
  role: "student",
  termsAccepted: true,
  termsVersion: "2026-06-18",
};

const successResponse: RegisterResponse = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "student",
  status: "pending_verification",
  created_at: "2026-06-18T04:24:34Z",
};

function createDeps(overrides?: {
  register?: () => Promise<RegisterResponse>;
  navigate?: () => void;
}) {
  return {
    register: vi.fn(overrides?.register ?? (() => Promise.resolve(successResponse))),
    navigate: vi.fn(overrides?.navigate ?? (() => {})),
  };
}

describe("registerCommand", () => {
  it("registers the user and navigates to the success page", async () => {
    const deps = createDeps();
    const key = "idem-key-1";

    await registerCommand(validInput, key, deps);

    expect(deps.register).toHaveBeenCalledWith(validInput, key);
    expect(deps.navigate).toHaveBeenCalledWith(routePaths.registerSuccess, {
      state: { user: { name: successResponse.name, email: successResponse.email } },
    });
  });

  it("passes the same idempotency key when called again with the same key", async () => {
    const deps = createDeps();
    const key = "idem-key-2";

    await registerCommand(validInput, key, deps);
    await registerCommand(validInput, key, deps);

    expect(deps.register).toHaveBeenCalledTimes(2);
    expect(deps.register).toHaveBeenNthCalledWith(1, validInput, key);
    expect(deps.register).toHaveBeenNthCalledWith(2, validInput, key);
  });

  it("rethrows registration errors and does not navigate", async () => {
    const error = new ApiError({
      message: "too many requests",
      status: 429,
      code: "rate_limited",
    });
    const deps = createDeps({
      register: () => Promise.reject(error),
    });

    await expect(registerCommand(validInput, "key", deps)).rejects.toBe(error);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});
