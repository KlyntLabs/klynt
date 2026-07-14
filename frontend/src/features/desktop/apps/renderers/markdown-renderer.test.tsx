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

  /*
   * Astryx's Markdown renders components from the markdown string and never constructs HTML, so
   * embedded markup cannot become live DOM. These assertions check that property directly rather
   * than checking that a sanitiser ran: there is no sanitiser any more, and nothing to sanitise.
   */
  it.each([
    ["script tag", "<script>alert(1)</script>"],
    ["inline event handler", "<p onclick='alert(2)'>Hi</p>"],
    ["img onerror", "<img src=x onerror='alert(3)'>"],
    ["javascript: url", "[click me](javascript:alert(4))"],
    ["iframe", "<iframe src='https://evil.example'></iframe>"],
  ])("renders %s as inert content, never as live DOM", (_label, payload) => {
    const { container } = render(<MarkdownRenderer content={{ text: payload }} readOnly />);

    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("iframe")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();

    // No element anywhere carries an inline handler or a javascript: navigation target.
    for (const el of container.querySelectorAll("*")) {
      for (const attr of el.attributes) {
        expect(attr.name).not.toMatch(/^on/i);
        expect(attr.value.replace(/\s/g, "").toLowerCase()).not.toContain("javascript:");
      }
    }
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
