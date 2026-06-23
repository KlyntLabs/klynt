import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import SessionsPage from "./sessions-page";

describe("SessionsPage", () => {
  it("lists sessions and allows revocation", async () => {
    const user = userEvent.setup();
    let sessions = [
      {
        id: "s-current",
        user_id: "u-1",
        kind: "access",
        created_at: "2026-06-20T08:00:00Z",
        expires_at: "2026-06-20T09:00:00Z",
        user_agent: "Current Browser",
        ip_address: "127.0.0.1",
      },
      {
        id: "s-other",
        user_id: "u-1",
        kind: "refresh",
        created_at: "2026-06-19T08:00:00Z",
        expires_at: "2026-06-26T08:00:00Z",
        ip_address: "192.168.1.1",
      },
    ];

    server.use(
      http.get("/api/v1/auth/sessions", () => HttpResponse.json({ data: { sessions } })),
      http.delete("/api/v1/auth/sessions/s-other", () => {
        sessions = sessions.filter((s) => s.id !== "s-other");
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/settings/sessions" element={<SessionsPage />} />
      </Routes>,
      { initialEntries: ["/settings/sessions"] }
    );

    expect(await screen.findByText("Current Browser")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();

    const revokeButton = screen.getAllByRole("button", { name: /revoke/i })[1];
    await user.click(revokeButton);

    await waitFor(() => {
      expect(screen.queryByText("192.168.1.1")).not.toBeInTheDocument();
    });
  });

  it("shows an empty state when there are no sessions", async () => {
    server.use(
      http.get("/api/v1/auth/sessions", () => HttpResponse.json({ data: { sessions: [] } }))
    );

    render(
      <Routes>
        <Route path="/settings/sessions" element={<SessionsPage />} />
      </Routes>,
      { initialEntries: ["/settings/sessions"] }
    );

    expect(await screen.findByText("No active sessions found.")).toBeInTheDocument();
  });
});
