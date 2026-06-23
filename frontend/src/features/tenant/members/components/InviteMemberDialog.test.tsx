import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { InviteMemberDialog } from "./InviteMemberDialog";

describe("InviteMemberDialog", () => {
  it("submits email and role", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();

    render(<InviteMemberDialog open onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), "ada@example.test");
    await user.selectOptions(screen.getByLabelText(/role/i), "admin");

    await user.click(screen.getByRole("button", { name: /invite member/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@example.test", role: "admin" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<InviteMemberDialog open onOpenChange={onOpenChange} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
