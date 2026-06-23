import { HttpResponse, http } from "msw";

const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  full_name: "Test User",
  email: "test@example.com",
  role: "student",
  status: "active",
  created_at: "2026-06-18T04:24:34Z",
};

export const usersHandlers = [
  http.post("/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === "duplicate@example.com") {
      return HttpResponse.json(
        { success: false, code: "conflict", error: "email already registered" },
        { status: 409 }
      );
    }
    if (body.email === "rate@example.com") {
      return HttpResponse.json(
        { success: false, code: "rate_limited", error: "too many requests" },
        { status: 429 }
      );
    }
    return HttpResponse.json({ data: mockUser.id }, { status: 201 });
  }),

  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === "locked@example.com") {
      return HttpResponse.json(
        { success: false, code: "unauthorized", error: "Invalid credentials" },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      data: { user: { ...mockUser, email: body.email ?? mockUser.email } },
    });
  }),

  http.get("/api/v1/users/me", () => {
    return HttpResponse.json({ data: mockUser });
  }),

  http.post("/api/v1/auth/logout", () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),

  http.post("/api/v1/auth/verify-email", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "invalid") {
      return HttpResponse.json(
        { success: false, code: "invalid_token", error: "Invalid token" },
        { status: 400 }
      );
    }
    return HttpResponse.json({ success: true, message: "Email verified successfully" });
  }),

  http.post("/api/v1/auth/request-password-reset", async () => {
    return HttpResponse.json({
      success: true,
      message: "If the email exists, a reset link has been sent",
    });
  }),

  http.post("/api/v1/auth/reset-password", async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (body.token === "invalid") {
      return HttpResponse.json(
        { success: false, code: "invalid_token", error: "Invalid token" },
        { status: 400 }
      );
    }
    return HttpResponse.json({ success: true, message: "Password reset successfully" });
  }),
];
