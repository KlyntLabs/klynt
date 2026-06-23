import { describe, expect, it } from "vitest";
import { loginSchema } from "./login-schema";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "ada@example.com",
      password: "password",
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password",
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "ada@example.com",
      password: "",
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });
});
