import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { GuestRoute, ProtectedRoute, RoleGuard } from "./auth-identity";
import { useAuthStore } from "./auth-store";

vi.mock("./external-redirect", () => ({
  isExternalUrl: (url: string) => /^https?:/.test(url),
  navigateExternal: vi.fn(),
  ExternalNavigate: ({ to }: { to: string }) => <div data-testid="external-navigate">{to}</div>,
}));

function setup() {
  useAuthStore.getState().reset();
  useAuthStore.getState().setLoading(false);
}

function setAuthenticated(role: "admin" | "instructor" | "student" = "student") {
  useAuthStore.getState().setSession({
    id: "u-1",
    email: "a@b.com",
    username: "a",
    name: "A",
    role,
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

describe("route guards", () => {
  it("ProtectedRoute redirects to login subdomain when unauthenticated", () => {
    setup();
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
    expect(screen.getByTestId("external-navigate")).toHaveTextContent(
      /login\.localhost(:\d+)?\/\?from=/
    );
  });

  it("GuestRoute redirects to apex dashboard when authenticated", () => {
    setup();
    setAuthenticated();
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
    expect(screen.getByTestId("external-navigate")).toHaveTextContent(
      /localhost(:\d+)?\/dashboard/
    );
  });

  it("RoleGuard blocks non-admins from admin route", () => {
    setup();
    setAuthenticated("student");
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
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
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

  it("ProtectedRoute renders children when authenticated", () => {
    setup();
    setAuthenticated();
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
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("GuestRoute renders children when unauthenticated", () => {
    setup();
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
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });

  it("RoleGuard renders children for allowed role", () => {
    setup();
    setAuthenticated("admin");
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
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
