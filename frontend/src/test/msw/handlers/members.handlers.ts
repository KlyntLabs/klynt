import { HttpResponse, http } from "msw";

interface BackendMember {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  joined_at: string;
}

const membersBySlug = new Map<string, BackendMember[]>();

function getMembers(slug: string): BackendMember[] {
  if (!membersBySlug.has(slug)) {
    membersBySlug.set(slug, [
      {
        user_id: "user-owner",
        email: "owner@acme.test",
        full_name: "Owner User",
        role: "owner",
        joined_at: "2026-06-22T00:00:00Z",
      },
      {
        user_id: "user-member",
        email: "member@acme.test",
        full_name: "Member User",
        role: "member",
        joined_at: "2026-06-22T00:00:00Z",
      },
    ]);
  }
  return membersBySlug.get(slug) ?? [];
}

export const membersHandlers = [
  http.get("/api/v1/tenants/:slug/members", ({ params }) => {
    const slug = params.slug as string;
    return HttpResponse.json({ data: getMembers(slug) });
  }),

  http.post("/api/v1/tenants/:slug/invites", async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      role?: string;
    };
    const invite = {
      token: `invite-${Date.now()}`,
      email: body.email ?? "new@example.test",
      role: body.role ?? "member",
      expires_at: "2026-12-31T00:00:00Z",
    };
    return HttpResponse.json({ data: invite }, { status: 201 });
  }),

  http.patch("/api/v1/tenants/:slug/members", async ({ request, params }) => {
    const slug = params.slug as string;
    const body = (await request.json()) as {
      email?: string;
      role?: string;
    };
    const list = getMembers(slug);
    const index = list.findIndex((m) => m.email === body.email);
    if (index === -1) {
      return HttpResponse.json({ error: "Member not found" }, { status: 404 });
    }
    const updated: BackendMember = {
      ...list[index],
      role: body.role ?? list[index].role,
    };
    const next = [...list];
    next[index] = updated;
    membersBySlug.set(slug, next);
    return HttpResponse.json({ message: "Member role updated successfully" });
  }),

  http.delete("/api/v1/tenants/:slug/members", async ({ request, params }) => {
    const slug = params.slug as string;
    const body = (await request.json()) as { email?: string };
    const list = getMembers(slug);
    const next = list.filter((m) => m.email !== body.email);
    membersBySlug.set(slug, next);
    return new HttpResponse(null, { status: 204 });
  }),
];
