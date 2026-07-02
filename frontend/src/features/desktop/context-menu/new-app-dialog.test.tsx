import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { NewAppDialog } from "./new-app-dialog";

describe("NewAppDialog", () => {
  it("returns null when closed", () => {
    render(<NewAppDialog open={false} onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates an app when the form is filled and submitted", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(<NewAppDialog open defaultType="folder" onClose={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/title/i), "My Notes");

    const typeSelect = screen.getByRole("combobox", { name: /type/i });
    typeSelect.focus();
    await user.keyboard("{Enter}");
    const notesOption = await screen.findByRole("option", { name: "Notes" });
    await user.click(notesOption);

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(onCreate).toHaveBeenCalledWith({ type: "notes", title: "My Notes" });
  });

  it("does not submit and shows an error when the title is empty", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(<NewAppDialog open onClose={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/title is required/i);
  });

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<NewAppDialog open onClose={onClose} onCreate={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("resets the form when reopened", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const { rerender } = render(<NewAppDialog open onClose={vi.fn()} onCreate={onCreate} />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, "Draft");
    expect(titleInput).toHaveValue("Draft");

    rerender(<NewAppDialog open={false} onClose={vi.fn()} onCreate={onCreate} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<NewAppDialog open onClose={vi.fn()} onCreate={onCreate} />);
    expect(screen.getByLabelText(/title/i)).toHaveValue("");
  });

  it("displays the error message when onCreate throws", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockRejectedValue(new Error("Save failed"));

    render(<NewAppDialog open onClose={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/title/i), "My App");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    });
  });
});
