import { screen, waitFor, within } from "@testing-library/react";
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

    // The page's "Invite member" trigger and the dialog's submit button share a label, and
    // Astryx's Dialog keeps its content mounted, so both are always in the DOM. The trigger
    // is the one outside the dialog; the submit is scoped to it.
    const dialogEl = document.querySelector("dialog");
    const triggers = screen
      .getAllByRole("button", { name: /invite member/i })
      .filter((button) => !dialogEl?.contains(button));
    await user.click(triggers[0]);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/email/i), "new@acme.test");
    await user.click(within(dialog).getByRole("button", { name: /invite member/i }));

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

    // Astryx's Selector is a combobox: click to open, then pick the option. The old test
    // focused the Radix trigger and pressed Enter, which no longer applies.
    const roleSelect = screen.getByTestId("role-select-member@acme.test");
    await user.click(within(roleSelect).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /admin/i }));

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

    // Astryx's AlertDialog owns its action/cancel buttons and exposes no test ids, so the
    // confirm button is reached through the dialog's role. Scoping matters: its action label
    // is the same word as the per-row remove button.
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/are you sure/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(screen.queryByText("member@acme.test")).not.toBeInTheDocument();
    });
  });
});
