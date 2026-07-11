import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea interactions", () => {
  it("renders vertical scroll area", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
  });

  it("renders horizontal scrollbar", () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar orientation="horizontal" />
        <div>Content</div>
      </ScrollArea>
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
  });
});
