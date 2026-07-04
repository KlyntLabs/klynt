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

    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
});
