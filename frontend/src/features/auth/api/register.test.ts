import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { register } from "@/core/auth/api/auth-api";
import { server } from "@/test/msw/server";

const input = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Str0ng!pass",
};

describe("register", () => {
  it("returns the created user id", async () => {
    server.use(
      http.post("/api/v1/auth/register", async ({ request }) => {
        const body = (await request.json()) as { full_name?: string; email: string };
        expect(body.email).toBe(input.email);
        expect(body.full_name).toBe(input.name);
        return HttpResponse.json({ data: "550e8400-e29b-41d4-a716-446655440000" }, { status: 201 });
      })
    );

    const result = await register(input);
    expect(result.userId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("throws an ApiError for conflict response", async () => {
    server.use(
      http.post("/api/v1/auth/register", () =>
        HttpResponse.json(
          { success: false, code: "conflict", error: "email exists" },
          { status: 409 }
        )
      )
    );

    await expect(register(input)).rejects.toMatchObject({
      status: 409,
      code: "conflict",
    });
  });
});
