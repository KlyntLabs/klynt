import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { useAuthStore } from "./auth-store";
import { GuestRoute, ProtectedRoute, RoleGuard } from "./route-guards";
import type { User, UserRole } from "./types";

vi.mock("./external-redirect", () => ({
  isExternalUrl: (url: string) => /^https?:/.test(url),
  navigateExternal: vi.fn(),
  ExternalNavigate: ({ to }: { to: string }) => <div data-testid="external-navigate">{to}</div>,
}));

const baseUser: User = {
  id: "u-1",
  email: "a@b.com",
  username: "a",
  name: "A",
  role: "student",
  status: "active",
  createdAt: "2024-01-01T00:00:00Z",
};

function setup() {
  useAuthStore.getState().reset();
  useAuthStore.getState().setLoading(false);
}

function setAuthenticated(role: UserRole = "student") {
  useAuthStore.getState().setSession({ ...baseUser, role });
}

function mockMeResponse(role: UserRole | null) {
  server.use(
    http.get("/api/v1/users/me", () =>
      role
        ? HttpResponse.json({ data: { ...baseUser, role } })
        : new HttpResponse(null, { status: 401 })
    )
  );
}

function mockMeUnauthorized() {
  mockMeResponse(null);
}

describe("route guards", () => {
  it("ProtectedRoute redirects to login subdomain when unauthenticated", async () => {
    setup();
    mockMeUnauthorized();
    render(
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/dashboard"] }
    );
    await waitFor(() =>
      expect(screen.getByTestId("external-navigate")).toHaveTextContent(
        /login\.localhost(:\d+)?\/\?from=/
      )
    );
  });

  it("GuestRoute redirects to apex dashboard when authenticated", async () => {
    setup();
    setAuthenticated();
    mockMeResponse("student");
    render(
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <div>Register page</div>
            </GuestRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/register"] }
    );
    await waitFor(() =>
      expect(screen.getByTestId("external-navigate")).toHaveTextContent(
        /localhost(:\d+)?\/dashboard/
      )
    );
  });

  it("RoleGuard blocks non-admins from admin route", async () => {
    setup();
    setAuthenticated("student");
    mockMeResponse("student");
    render(
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <div>Admin</div>
            </RoleGuard>
          }
        />
      </Routes>,
      { initialEntries: ["/admin"] }
    );
    await waitFor(() =>
      expect(screen.getByTestId("external-navigate")).toHaveTextContent(/admin\.localhost(:\d+)?\//)
    );
  });

  it("ProtectedRoute shows loading state", () => {
    setup();
    useAuthStore.getState().setLoading(true);
    render(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/dashboard"] }
    );
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it("ProtectedRoute renders children when authenticated", async () => {
    setup();
    setAuthenticated();
    mockMeResponse("student");
    render(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/dashboard"] }
    );
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  });

  it("GuestRoute renders children when unauthenticated", async () => {
    setup();
    mockMeUnauthorized();
    render(
      <Routes>
        <Route
          path="/register"
          element={
            <GuestRoute>
              <div>Register page</div>
            </GuestRoute>
          }
        />
      </Routes>,
      { initialEntries: ["/register"] }
    );
    await waitFor(() => expect(screen.getByText("Register page")).toBeInTheDocument());
  });

  it("RoleGuard renders children for allowed role", async () => {
    setup();
    setAuthenticated("admin");
    mockMeResponse("admin");
    render(
      <Routes>
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={["admin"]}>
              <div>Admin</div>
            </RoleGuard>
          }
        />
      </Routes>,
      { initialEntries: ["/admin"] }
    );
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
  });
});
