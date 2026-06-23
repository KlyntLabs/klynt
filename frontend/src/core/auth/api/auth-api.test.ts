import { decamelizeKeys } from "humps";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import {
  getMe,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "./auth-api";

const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  role: "student" as const,
  status: "active" as const,
  createdAt: "2024-01-01T00:00:00Z",
};

const backendUser = decamelizeKeys(mockUser);

describe("auth-api", () => {
  it("login returns mapped user", async () => {
    server.use(
      http.post("/api/v1/auth/login", () => HttpResponse.json({ data: { user: backendUser } }))
    );

    const user = await login({ email: mockUser.email, password: "password" });
    expect(user.id).toBe(mockUser.id);
    expect(user.name).toBe(mockUser.fullName);
    expect(user.role).toBe(mockUser.role);
  });

  it("register returns user id", async () => {
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json({ data: mockUser.id }, { status: 201 })
      )
    );

    const result = await register({ name: "Ada", email: mockUser.email, password: "password" });
    expect(result.userId).toBe(mockUser.id);
  });

  it("logout posts to auth/logout", async () => {
    server.use(http.post("/api/v1/auth/logout", () => HttpResponse.json({ message: "ok" })));
    await expect(logout()).resolves.toBeUndefined();
  });

  it("getMe returns mapped user", async () => {
    server.use(http.get("/api/v1/users/me", () => HttpResponse.json({ data: backendUser })));

    const user = await getMe();
    expect(user.email).toBe(mockUser.email);
  });

  it("verifyEmail posts token", async () => {
    server.use(
      http.post("/api/v1/auth/verify-email", async ({ request }) => {
        const body = (await request.json()) as { token?: string };
        expect(body.token).toBe("token-123");
        return HttpResponse.json({ message: "ok" });
      })
    );

    await expect(verifyEmail({ token: "token-123" })).resolves.toBeUndefined();
  });

  it("requestPasswordReset posts email", async () => {
    server.use(
      http.post("/api/v1/auth/request-password-reset", async ({ request }) => {
        const body = (await request.json()) as { email?: string };
        expect(body.email).toBe(mockUser.email);
        return HttpResponse.json({ message: "ok" });
      })
    );

    await expect(requestPasswordReset({ email: mockUser.email })).resolves.toBeUndefined();
  });

  it("resetPassword posts token and password", async () => {
    server.use(
      http.post("/api/v1/auth/reset-password", async ({ request }) => {
        const body = (await request.json()) as { token?: string; new_password?: string };
        expect(body.token).toBe("token-123");
        expect(body.new_password).toBe("new-password");
        return HttpResponse.json({ message: "ok" });
      })
    );

    await expect(
      resetPassword({ token: "token-123", password: "new-password" })
    ).resolves.toBeUndefined();
  });
});
