import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { listSessions, revokeSession } from "./session-api";

const rawSessions = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    user_id: "550e8400-e29b-41d4-a716-446655440001",
    kind: "access",
    created_at: "2026-06-20T08:00:00Z",
    expires_at: "2026-06-20T09:00:00Z",
    user_agent: "Mozilla/5.0",
    ip_address: "127.0.0.1",
    is_current: true,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    user_id: "550e8400-e29b-41d4-a716-446655440001",
    kind: "refresh",
    created_at: "2026-06-20T08:00:00Z",
    expires_at: "2026-06-27T08:00:00Z",
  },
];

describe("sessionApi", () => {
  it("lists and camelizes sessions", async () => {
    server.use(
      http.get("/api/v1/auth/sessions", () =>
        HttpResponse.json({ data: { sessions: rawSessions } })
      )
    );

    const sessions = await listSessions();

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({
      id: rawSessions[0].id,
      userId: rawSessions[0].user_id,
      kind: "access",
      createdAt: rawSessions[0].created_at,
      expiresAt: rawSessions[0].expires_at,
      userAgent: rawSessions[0].user_agent,
      ipAddress: rawSessions[0].ip_address,
      isCurrent: true,
    });
    expect(sessions[1].isCurrent).toBeUndefined();
  });

  it("revokes a session by id", async () => {
    const id = rawSessions[0].id;
    let called = false;
    server.use(
      http.delete(`/api/v1/auth/sessions/${id}`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    await revokeSession(id);

    expect(called).toBe(true);
  });
});
