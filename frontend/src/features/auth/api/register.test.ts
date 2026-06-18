import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { registerUser } from "./register";

const input = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "str0ng!passphrase",
  role: "student" as const,
  termsAccepted: true,
  termsVersion: "2026-06-18",
};

describe("registerUser", () => {
  it("sends the provided idempotency key", async () => {
    let capturedKey: string | null = null;

    server.use(
      http.post("/api/v1/users", async ({ request }) => {
        capturedKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          {
            id: "550e8400-e29b-41d4-a716-446655440000",
            name: input.name,
            email: input.email,
            role: input.role,
            status: "pending_verification",
            created_at: "2026-06-18T04:24:34Z",
          },
          { status: 201 }
        );
      })
    );

    await registerUser(input, "my-stable-key");
    expect(capturedKey).toBe("my-stable-key");
  });
});
