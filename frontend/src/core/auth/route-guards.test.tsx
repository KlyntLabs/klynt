import { render } from "@/test/render";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { GuestRoute, ProtectedRoute, RoleGuard } from "./auth-identity";
import { useAuthStore } from "./auth-store";

function setup() {
  useAuthStore.getState().reset();
}

describe("route guards", () => {
  it("ProtectedRoute redirects when unauthenticated", () => {
    setup();
    render(
      <Routes>
        <Route path="/register" element={<div>Register page</div>} />
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
    expect(screen.getByText("Register page")).toBeInTheDocument();
  });

  it("GuestRoute redirects when authenticated", () => {
    setup();
    useAuthStore
      .getState()
      .setSession({ id: "u-1", email: "a@b.com", name: "A", role: "student" }, "token");
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
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("RoleGuard blocks non-admins from admin route", () => {
    setup();
    useAuthStore
      .getState()
      .setSession({ id: "u-1", email: "a@b.com", name: "A", role: "student" }, "token");
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
});
