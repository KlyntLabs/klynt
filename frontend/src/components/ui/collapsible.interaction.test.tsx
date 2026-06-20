import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

describe("Collapsible interactions", () => {
  it("renders the open state", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>
    );
    expect(screen.getByText("Collapsible content")).toBeInTheDocument();
  });

  it("toggles collapsible content", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    );
    const trigger = screen.getByText("Toggle");
    fireEvent.click(trigger);
    expect(screen.getByText("Hidden content")).toBeInTheDocument();
  });
});
