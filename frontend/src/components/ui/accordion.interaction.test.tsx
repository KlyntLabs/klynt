import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

describe("Accordion interactions", () => {
  it("renders the open state", () => {
    render(
      <Accordion type="single" defaultValue="item-1" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>Yes.</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText("Yes.")).toBeInTheDocument();
  });

  it("toggles accordion item", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const trigger = screen.getByText("Question");
    fireEvent.click(trigger);
    expect(screen.getByText("Answer")).toBeInTheDocument();
    fireEvent.click(trigger);
  });
});
