import { describe, expect, it } from "vitest";
import { forgotPasswordSchema } from "./forgot-password-schema";

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "ada@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});
