import { HttpResponse, http } from "msw";

export const tenantHandlers = [
  http.get("/api/v1/tenants", () =>
    HttpResponse.json({
      data: [
        {
          id: "1",
          slug: "acme",
          name: "Acme",
          role: "owner",
          joinedAt: "2026-06-22T00:00:00Z",
        },
      ],
    })
  ),
  http.post("/api/v1/tenants", async ({ request }) => {
    const body = (await request.json()) as { slug?: string; name?: string };
    return HttpResponse.json(
      {
        data: {
          id: "2",
          slug: body.slug ?? "new-tenant",
          name: body.name ?? "New Tenant",
          role: "owner",
          joinedAt: "2026-06-22T00:00:00Z",
        },
      },
      { status: 201 }
    );
  }),
];
