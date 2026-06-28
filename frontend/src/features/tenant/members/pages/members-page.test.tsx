import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { render } from "@/test/render";
import MembersPage from "./members-page";

const baseTenant = {
  id: "t-1",
  slug: "acme",
  name: "Acme",
  joinedAt: "2026-06-22T00:00:00Z",
};

describe("MembersPage", () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it("lists tenant members and invites a new member", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/members" element={<MembersPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/members"] }
    );

    expect(await screen.findByText("owner@acme.test")).toBeInTheDocument();
    expect(screen.getByText("member@acme.test")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/email/i), "new@acme.test");
    await user.click(screen.getByRole("button", { name: /invite member/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("updates a member role", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/members" element={<MembersPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/members"] }
    );

    expect(await screen.findByText("member@acme.test")).toBeInTheDocument();

    const roleSelect = screen.getByTestId("role-select-member@acme.test");
    roleSelect.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: /admin/i }));

    await waitFor(() => {
      expect(screen.getByTestId("role-select-member@acme.test")).toHaveTextContent("Admin");
    });
  });

  it("removes a member after confirmation", async () => {
    useAuthStore.getState().setActiveTenant({ ...baseTenant, role: "owner" });
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/tenants/:slug/members" element={<MembersPage />} />
      </Routes>,
      { initialEntries: ["/tenants/acme/members"] }
    );

    expect(await screen.findByText("member@acme.test")).toBeInTheDocument();

    await user.click(screen.getByTestId("remove-member-member@acme.test"));

    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("confirm-remove-member"));

    await waitFor(() => {
      expect(screen.queryByText("member@acme.test")).not.toBeInTheDocument();
    });
  });
});
