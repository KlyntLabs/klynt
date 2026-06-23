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

    expect(await screen.findByText("new@acme.test")).toBeInTheDocument();
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

    const row = screen.getByText("member@acme.test").closest("tr");
    const roleSelect = row?.querySelector("select");
    expect(roleSelect).toBeInstanceOf(HTMLSelectElement);
    await user.selectOptions(roleSelect as HTMLSelectElement, "admin");

    await waitFor(() => {
      expect((roleSelect as HTMLSelectElement).value).toBe("admin");
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

    const row = screen.getByText("member@acme.test").closest("tr");
    const removeButton = row?.querySelector("button");
    expect(removeButton).toBeInstanceOf(HTMLButtonElement);
    await user.click(removeButton as HTMLButtonElement);

    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: /^remove$/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText("member@acme.test")).not.toBeInTheDocument();
    });
  });
});
