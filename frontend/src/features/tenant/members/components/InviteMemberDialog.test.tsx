import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { InviteMemberDialog } from "./InviteMemberDialog";

describe("InviteMemberDialog", () => {
  it("submits email and role", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <InviteMemberDialog open isPending={false} onOpenChange={onOpenChange} onInvite={onInvite} />
    );

    await user.type(screen.getByLabelText(/email/i), "ada@example.test");

    // The old test reached into Radix's hidden native <select> sibling — a library
    // implementation detail. Astryx's Selector is a combobox with a listbox popover and has
    // no such element, so drive it the way a user does: open it, then pick the option.
    await user.click(screen.getByRole("combobox", { name: /role/i }));
    await user.click(await screen.findByRole("option", { name: /admin/i }));

    await user.click(screen.getByRole("button", { name: /invite member/i }));

    expect(onInvite).toHaveBeenCalledWith({ email: "ada@example.test", role: "admin" });
  });

  it("closes only when invite succeeds", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <InviteMemberDialog open isPending={false} onOpenChange={onOpenChange} onInvite={onInvite} />
    );

    await user.type(screen.getByLabelText(/email/i), "ada@example.test");
    await user.click(screen.getByRole("button", { name: /invite member/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open when invite fails", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn().mockRejectedValue(new Error("Invite failed"));
    const onOpenChange = vi.fn();

    render(
      <InviteMemberDialog open isPending={false} onOpenChange={onOpenChange} onInvite={onInvite} />
    );

    await user.type(screen.getByLabelText(/email/i), "ada@example.test");
    await user.click(screen.getByRole("button", { name: /invite member/i }));

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <InviteMemberDialog open isPending={false} onOpenChange={onOpenChange} onInvite={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
