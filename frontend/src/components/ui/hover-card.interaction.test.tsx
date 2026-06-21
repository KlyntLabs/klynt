import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

describe("HoverCard interactions", () => {
  it("renders the open state", () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger>Hover</HoverCardTrigger>
        <HoverCardContent>Hover card content</HoverCardContent>
      </HoverCard>
    );
    expect(screen.getByText("Hover card content")).toBeInTheDocument();
  });

  it("shows content on hover", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>Hover card content</HoverCardContent>
      </HoverCard>
    );
    await user.hover(screen.getByText("Hover me"));
    expect(await screen.findByText("Hover card content")).toBeInTheDocument();
  });
});
