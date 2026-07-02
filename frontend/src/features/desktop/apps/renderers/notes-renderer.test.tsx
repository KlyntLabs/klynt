import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotesRenderer } from "./notes-renderer";

describe("NotesRenderer", () => {
  it("renders text in readOnly mode", () => {
    render(<NotesRenderer content={{ text: "Hello notes" }} readOnly />);

    const readonlyView = screen.getByTestId("notes-readonly");
    expect(readonlyView).toHaveTextContent("Hello notes");
  });

  it("renders an editable textarea and calls onChange with debounced updates", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <NotesRenderer content={{ text: "Initial" }} readOnly={false} onChange={handleChange} />
    );

    const editor = screen.getByTestId("notes-editor");
    await user.type(editor, " text");

    expect(handleChange).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(handleChange).toHaveBeenCalledWith({ text: "Initial text" });
      },
      { timeout: 1000 }
    );
  });

  it("does not crash when content.text is missing or not a string", () => {
    const { rerender } = render(<NotesRenderer content={{}} readOnly />);

    expect(screen.getByTestId("notes-readonly")).toBeInTheDocument();

    rerender(<NotesRenderer content={{ text: 123 }} readOnly />);

    expect(screen.getByTestId("notes-readonly")).toBeInTheDocument();
  });
});
