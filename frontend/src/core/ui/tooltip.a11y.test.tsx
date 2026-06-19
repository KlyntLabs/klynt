import { screen } from "@testing-library/react";
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

describe("Tooltip accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <TooltipProvider>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Accessible tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </main>
    );
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
