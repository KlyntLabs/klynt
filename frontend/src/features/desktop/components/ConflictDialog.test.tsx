import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test/render";
import { ConflictDialog } from "./ConflictDialog";

describe("ConflictDialog", () => {
  it("does not render when closed", () => {
    render(<ConflictDialog open={false} onReload={vi.fn()} onRetry={vi.fn()} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title, message and buttons when open", () => {
    render(
      <ConflictDialog
        open
        title="Conflict title"
        message="Conflict message"
        onReload={vi.fn()}
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // role="alertdialog", not "dialog": the dialog is purpose="required", so neither a
    // backdrop click nor Escape may dismiss it and silently drop the user's unsaved edits.
    // Astryx maps that purpose onto the alertdialog role, which is the correct semantics.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Conflict title")).toBeInTheDocument();
    expect(screen.getByText("Conflict message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onReload when the reload button is clicked", async () => {
    const onReload = vi.fn();
    render(<ConflictDialog open onReload={onReload} onRetry={vi.fn()} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ConflictDialog open onReload={vi.fn()} onRetry={onRetry} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the cancel button is clicked", async () => {
    const onClose = vi.fn();
    render(<ConflictDialog open onReload={vi.fn()} onRetry={vi.fn()} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * The whole point of purpose="required": an unresolved save conflict must not be dismissable
   * by a stray Escape, or the user's edits vanish. Astryx enforces this by calling
   * preventDefault() on the native `cancel` event and refusing to close, so a real browser
   * leaves the dialog open. src/test/dialog-shim.ts has to honour that same contract —
   * otherwise this passes in a browser and only jsdom disagrees.
   */
  it("does not close on Escape, because a save conflict must be resolved deliberately", async () => {
    const onClose = vi.fn();
    render(<ConflictDialog open onReload={vi.fn()} onRetry={vi.fn()} onClose={onClose} />);

    await userEvent.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
