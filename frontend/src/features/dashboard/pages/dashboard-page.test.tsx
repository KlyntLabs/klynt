import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import type { UserRole } from "@/core/auth/types";
import { server } from "@/test/msw/server";
import { render } from "@/test/render";
import { DashboardPage } from "./dashboard-page";

function UserDesktopPlaceholder() {
  const { profileId } = useParams();
  return (
    <div data-testid="user-desktop">
      User desktop <span data-testid="profile-id">{profileId}</span>
    </div>
  );
}

function TestRouter() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/u/:profileId" element={<UserDesktopPlaceholder />} />
    </Routes>
  );
}

function setUser(role: UserRole) {
  const user = {
    id: "u-1",
    email: "test@example.com",
    username: "test",
    name: "Test User",
    role,
    status: "active" as const,
    createdAt: "2024-01-01T00:00:00Z",
  };

  useAuthStore.getState().setSession(user);
  server.use(
    http.get("/api/v1/users/me", () =>
      HttpResponse.json({
        data: {
          id: user.id,
          email: user.email,
          full_name: user.name,
          role,
          status: "active",
          created_at: user.createdAt,
        },
      })
    )
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("renders the admin desktop for admin users", async () => {
    setUser("admin");

    render(<TestRouter />, {
      initialEntries: ["/dashboard"],
    });

    expect(await screen.findByText("Klynt")).toBeInTheDocument();
  });

  it("redirects non-admin users to their user desktop", async () => {
    setUser("student");

    render(<TestRouter />, {
      initialEntries: ["/dashboard"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-desktop")).toBeInTheDocument();
    });
    expect(screen.getByTestId("profile-id")).toHaveTextContent("u-1");
  });
});
