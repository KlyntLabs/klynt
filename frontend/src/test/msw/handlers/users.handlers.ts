import { http, HttpResponse } from "msw";

export const usersHandlers = [
  http.post("/api/v1/users", async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    if (body.email === "duplicate@example.com") {
      return HttpResponse.json(
        { code: "conflict", message: "email already registered" },
        { status: 409 }
      );
    }
    if (body.email === "rate@example.com") {
      return HttpResponse.json(
        { code: "rate_limited", message: "too many requests" },
        { status: 429 }
      );
    }
    return HttpResponse.json(
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: body.email?.split("@")[0] ?? "Test User",
        email: body.email ?? "test@example.com",
        role: "student",
        status: "pending_verification",
        created_at: "2026-06-18T04:24:34Z",
      },
      { status: 201 }
    );
  }),
];
