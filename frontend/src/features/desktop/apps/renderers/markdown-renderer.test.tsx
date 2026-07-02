import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders markdown preview from content.text", () => {
    render(<MarkdownRenderer content={{ text: "# Hello" }} readOnly />);

    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("h1")).toHaveTextContent("Hello");
  });

  it("strips script tags and event handlers from rendered markdown", () => {
    render(
      <MarkdownRenderer
        content={{ text: "<script>alert(1)</script><p onclick='alert(2)'>Hi</p>" }}
        readOnly
      />
    );

    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("script")).not.toBeInTheDocument();
    expect(preview.querySelector("p")).not.toHaveAttribute("onclick");
  });

  it("renders an editable textarea and calls onChange with debounced updates", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <MarkdownRenderer content={{ text: "Initial" }} readOnly={false} onChange={handleChange} />
    );

    const editor = screen.getByTestId("markdown-editor");
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
    const { rerender } = render(<MarkdownRenderer content={{}} readOnly />);

    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();

    rerender(<MarkdownRenderer content={{ text: 123 }} readOnly />);

    expect(screen.getByTestId("markdown-preview")).toBeInTheDocument();
  });
});
