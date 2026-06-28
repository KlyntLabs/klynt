import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import SessionsPage from "./sessions-page";

const baseSessions = [
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

describe("SessionsPage", () => {
  it("lists sessions and allows revocation", async () => {
    const user = userEvent.setup();
    let sessions = [...baseSessions];

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

    const buttons = screen.getAllByRole("button", { name: /revoke session/i });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();

    await user.click(buttons[1]);

    await waitFor(() => {
      expect(screen.queryByText("192.168.1.1")).not.toBeInTheDocument();
    });
  });

  it("shows per-row pending state while revoking", async () => {
    const user = userEvent.setup();
    let resolveDelete: (() => void) | undefined;

    server.use(
      http.get("/api/v1/auth/sessions", () =>
        HttpResponse.json({ data: { sessions: baseSessions } })
      ),
      http.delete("/api/v1/auth/sessions/s-other", async () => {
        await new Promise<void>((resolve) => {
          resolveDelete = resolve;
        });
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/settings/sessions" element={<SessionsPage />} />
      </Routes>,
      { initialEntries: ["/settings/sessions"] }
    );

    const buttons = await screen.findAllByRole("button", { name: /revoke session/i });
    const otherButton = buttons[1];

    await user.click(otherButton);

    expect(otherButton).toBeDisabled();
    expect(await screen.findByText("Revoking...")).toBeInTheDocument();
    expect(buttons[0]).toBeDisabled(); // current session remains disabled

    resolveDelete?.();

    await waitFor(() => {
      expect(screen.queryByText("Revoking...")).not.toBeInTheDocument();
    });
  });

  it("renders an error alert with retry when listing fails", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    server.use(
      http.get("/api/v1/auth/sessions", () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { code: "bad_request", message: "bad request" },
            { status: 400 }
          );
        }
        return HttpResponse.json({ data: { sessions: baseSessions } });
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/settings/sessions" element={<SessionsPage />} />
        </Routes>
      </QueryClientProvider>,
      { initialEntries: ["/settings/sessions"] }
    );

    expect(await screen.findByText("Could not load sessions")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Current Browser")).toBeInTheDocument();
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
